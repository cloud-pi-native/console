import type { TestingModule } from '@nestjs/testing'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import { ScheduleModule } from '@nestjs/schedule'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { keycloakConfigFactory } from '../../config/keycloak'
import type { KeycloakConfig } from '../../config/keycloak'
import { KEYCLOAK_ADMIN_CLIENT, KeycloakClientService } from './keycloak-client.service'
import { ADMIN_TOKEN_REFRESH_INTERVAL_MS } from './keycloak.constants'

const keycloakUrl = 'https://keycloak.internal'
const projectRealm = 'project-realm'
// The only handled token endpoint is the master realm's: a token request
// against any other realm is unhandled and fails the test, which enforces
// the realm pinning of authenticate()
const tokenUrl = `${keycloakUrl}/realms/master/protocol/openid-connect/token`
const childrenUrl = `${keycloakUrl}/admin/realms/${projectRealm}/groups/:parentId/children`

const server = setupServer()

function useTokenEndpoint({ rejectGrant = () => false }: { rejectGrant?: (grantType: string | null) => boolean } = {}) {
  const tokenRequests: URLSearchParams[] = []
  let issued = 0
  server.use(
    http.post(tokenUrl, async ({ request }) => {
      const body = new URLSearchParams(await request.text())
      tokenRequests.push(body)
      if (rejectGrant(body.get('grant_type'))) {
        return HttpResponse.json({ error: 'invalid_grant' }, { status: 401 })
      }
      issued++
      return HttpResponse.json({ access_token: `access-token-${issued}`, refresh_token: `refresh-token-${issued}`, expires_in: 60 })
    }),
  )
  return tokenRequests
}

function createKeycloakClientServiceTestingModule(config: Partial<KeycloakConfig> = {}) {
  return Test.createTestingModule({
    imports: [ScheduleModule.forRoot()],
    providers: [
      KeycloakClientService,
      { provide: KEYCLOAK_ADMIN_CLIENT, useValue: new KcAdminClient({ baseUrl: keycloakUrl }) },
      {
        provide: keycloakConfigFactory.KEY,
        useValue: mockDeep<KeycloakConfig>({
          keycloakRealm: projectRealm,
          keycloakAdmin: 'admin',
          keycloakAdminPassword: 'admin-password',
          keycloakAdminClientId: 'admin-cli',
          ...config,
        }),
      },
    ],
  })
}

describe('keycloakClientService authentication lifecycle', () => {
  let module: TestingModule
  let client: KcAdminClient

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  beforeEach(async () => {
    vi.useFakeTimers()
    module = await createKeycloakClientServiceTestingModule().compile()
    client = module.get(KEYCLOAK_ADMIN_CLIENT)
  })
  afterEach(async () => {
    // close() re-runs init() on a module whose init() already failed; swallow
    // that rethrow so the "initial authentication fails" test can clean up
    await module.close().catch(() => {})
    server.resetHandlers()
    vi.useRealTimers()
  })
  afterAll(() => server.close())

  it('should authenticate with the password grant then switch to the project realm', async () => {
    const tokenRequests = useTokenEndpoint()

    await module.init()

    expect(tokenRequests).toHaveLength(1)
    expect(Object.fromEntries(tokenRequests[0])).toMatchObject({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: 'admin',
      password: 'admin-password',
    })
    expect(client.accessToken).toBe('access-token-1')
    expect(client.realmName).toBe(projectRealm)
  })

  it('should refresh the token periodically with the rotated refresh token so it never expires', async () => {
    const tokenRequests = useTokenEndpoint()
    await module.init()

    await vi.advanceTimersByTimeAsync(ADMIN_TOKEN_REFRESH_INTERVAL_MS)
    expect(tokenRequests).toHaveLength(2)
    expect(Object.fromEntries(tokenRequests[1])).toMatchObject({
      grant_type: 'refresh_token',
      client_id: 'admin-cli',
      refresh_token: 'refresh-token-1',
    })

    await vi.advanceTimersByTimeAsync(ADMIN_TOKEN_REFRESH_INTERVAL_MS)
    expect(tokenRequests).toHaveLength(3)
    expect(tokenRequests[2].get('refresh_token')).toBe('refresh-token-2')
    expect(client.accessToken).toBe('access-token-3')
    expect(client.realmName).toBe(projectRealm)
  })

  it('should fall back to a full re-authentication when the refresh grant fails', async () => {
    const tokenRequests = useTokenEndpoint({ rejectGrant: grantType => grantType === 'refresh_token' })
    await module.init()

    await vi.advanceTimersByTimeAsync(ADMIN_TOKEN_REFRESH_INTERVAL_MS)

    expect(tokenRequests.map(body => body.get('grant_type'))).toEqual(['password', 'refresh_token', 'password'])
    expect(client.accessToken).toBe('access-token-2')
    expect(client.realmName).toBe(projectRealm)
  })

  it('should keep refreshing and restore the project realm when both grants fail', async () => {
    let keycloakIsDown = false
    const tokenRequests = useTokenEndpoint({ rejectGrant: () => keycloakIsDown })
    await module.init()

    keycloakIsDown = true
    await vi.advanceTimersByTimeAsync(ADMIN_TOKEN_REFRESH_INTERVAL_MS)
    expect(tokenRequests.map(body => body.get('grant_type'))).toEqual(['password', 'refresh_token', 'password'])
    expect(client.realmName).toBe(projectRealm)

    keycloakIsDown = false
    await vi.advanceTimersByTimeAsync(ADMIN_TOKEN_REFRESH_INTERVAL_MS)
    expect(tokenRequests).toHaveLength(4)
    expect(tokenRequests[3].get('grant_type')).toBe('refresh_token')
    expect(client.accessToken).toBe('access-token-2')
  })

  it('should stop refreshing the token on module destroy', async () => {
    const tokenRequests = useTokenEndpoint()
    await module.init()
    expect(tokenRequests).toHaveLength(1)

    await module.close()

    await vi.advanceTimersByTimeAsync(ADMIN_TOKEN_REFRESH_INTERVAL_MS * 3)
    expect(tokenRequests).toHaveLength(1)
  })

  it('should rethrow when the initial authentication fails', async () => {
    const tokenRequests = useTokenEndpoint({ rejectGrant: () => true })

    await expect(module.init()).rejects.toThrow('Network response was not OK.')
    expect(client.realmName).toBe('master')

    await vi.advanceTimersByTimeAsync(ADMIN_TOKEN_REFRESH_INTERVAL_MS * 2)
    expect(tokenRequests).toHaveLength(1)
  })

  it('should not authenticate nor refresh the token when the Keycloak realm is not configured', async () => {
    const tokenRequests = useTokenEndpoint()
    await module.close()
    module = await createKeycloakClientServiceTestingModule({ keycloakRealm: undefined }).compile()

    await expect(module.init()).rejects.toThrow()

    await vi.advanceTimersByTimeAsync(ADMIN_TOKEN_REFRESH_INTERVAL_MS * 2)
    expect(tokenRequests).toHaveLength(0)
  })

  it('should not authenticate nor refresh the token when the admin credentials are not configured', async () => {
    const tokenRequests = useTokenEndpoint()
    await module.close()
    module = await createKeycloakClientServiceTestingModule({ keycloakAdminPassword: undefined }).compile()

    await expect(module.init()).rejects.toThrow()

    await vi.advanceTimersByTimeAsync(ADMIN_TOKEN_REFRESH_INTERVAL_MS * 2)
    expect(tokenRequests).toHaveLength(0)
  })
})

describe('getOrCreateSubGroupByName', () => {
  let module: TestingModule
  let service: KeycloakClientService

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  beforeEach(async () => {
    module = await createKeycloakClientServiceTestingModule().compile()
    service = module.get(KeycloakClientService)
    useTokenEndpoint()
    await module.init()
  })
  afterEach(async () => {
    await module.close()
    server.resetHandlers()
  })
  afterAll(() => server.close())

  it('should return the existing subgroup without creating it', async () => {
    // No POST handler: a create attempt would fail the test
    server.use(
      http.get(childrenUrl, ({ params }) => {
        expect(params.parentId).toBe('parent-id')
        return HttpResponse.json([{ id: 'sub-id', name: 'sub' }])
      }),
    )

    const result = await service.getOrCreateSubGroupByName('parent-id', 'sub')

    expect(result).toMatchObject({ id: 'sub-id', name: 'sub' })
  })

  it('should create the subgroup when it does not exist', async () => {
    server.use(
      http.get(childrenUrl, () => HttpResponse.json([])),
      http.post(childrenUrl, async ({ request, params }) => {
        expect(params.parentId).toBe('parent-id')
        expect(await request.json()).toEqual({ name: 'sub' })
        return new HttpResponse(null, {
          status: 201,
          headers: { location: `${keycloakUrl}/admin/realms/${projectRealm}/groups/created-id` },
        })
      }),
    )

    const result = await service.getOrCreateSubGroupByName('parent-id', 'sub')

    expect(result).toEqual({ id: 'created-id', name: 'sub' })
  })

  it('should re-fetch the subgroup when a concurrent creation causes a 409', async () => {
    server.use(
      http.get(childrenUrl, () => HttpResponse.json([]), { once: true }),
      http.get(childrenUrl, () => HttpResponse.json([{ id: 'concurrent-id', name: 'sub' }])),
      http.post(childrenUrl, () =>
        HttpResponse.json({ errorMessage: 'Sibling group named \'sub\' already exists.' }, { status: 409 })),
    )

    const result = await service.getOrCreateSubGroupByName('parent-id', 'sub')

    expect(result).toMatchObject({ id: 'concurrent-id', name: 'sub' })
  })

  it('should rethrow the 409 when the subgroup still cannot be found', async () => {
    server.use(
      http.get(childrenUrl, () => HttpResponse.json([])),
      http.post(childrenUrl, () =>
        HttpResponse.json({ errorMessage: 'Sibling group named \'sub\' already exists.' }, { status: 409 })),
    )

    await expect(service.getOrCreateSubGroupByName('parent-id', 'sub')).rejects.toThrow('Network response was not OK.')
  })

  it('should rethrow non-409 errors without re-fetching', async () => {
    let listCalls = 0
    server.use(
      http.get(childrenUrl, () => {
        listCalls++
        return HttpResponse.json([])
      }),
      http.post(childrenUrl, () =>
        HttpResponse.json({ error: 'unauthorized' }, { status: 401 })),
    )

    await expect(service.getOrCreateSubGroupByName('parent-id', 'sub')).rejects.toThrow('Network response was not OK.')
    expect(listCalls).toBe(1)
  })
})
