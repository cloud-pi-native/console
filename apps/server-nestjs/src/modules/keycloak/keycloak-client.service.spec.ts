import KcAdminClient from '@keycloak/keycloak-admin-client'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { KEYCLOAK_ADMIN_CLIENT, KeycloakClientService } from './keycloak-client.service'

const keycloakUrl = 'https://keycloak.internal'
const projectRealm = 'project-realm'
const tokenUrl = `${keycloakUrl}/realms/master/protocol/openid-connect/token`
const childrenUrl = `${keycloakUrl}/admin/realms/${projectRealm}/groups/:parentId/children`

const server = setupServer()

function useTokenEndpoint() {
  server.use(
    http.post(tokenUrl, () =>
      HttpResponse.json({ access_token: 'access-token', refresh_token: 'refresh-token', expires_in: 300 })),
  )
}

function createKeycloakClientServiceTestingModule(config: Partial<ConfigurationService> = {}) {
  return Test.createTestingModule({
    providers: [
      KeycloakClientService,
      { provide: KEYCLOAK_ADMIN_CLIENT, useValue: new KcAdminClient({ baseUrl: keycloakUrl }) },
      {
        provide: ConfigurationService,
        useValue: mockDeep<ConfigurationService>({
          keycloakRealm: projectRealm,
          keycloakAdmin: 'admin',
          keycloakAdminPassword: 'admin-password',
          ...config,
        }),
      },
    ],
  })
}

describe('keycloakClientService authentication lifecycle', () => {
  let service: KeycloakClientService
  let client: KcAdminClient

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  beforeEach(async () => {
    const module = await createKeycloakClientServiceTestingModule().compile()
    service = module.get(KeycloakClientService)
    client = module.get(KEYCLOAK_ADMIN_CLIENT)
  })
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('should authenticate with the password grant then switch to the project realm', async () => {
    server.use(
      http.post(tokenUrl, async ({ request }) => {
        const body = new URLSearchParams(await request.text())
        expect(body.get('grant_type')).toBe('password')
        expect(body.get('client_id')).toBe('admin-cli')
        expect(body.get('username')).toBe('admin')
        expect(body.get('password')).toBe('admin-password')
        return HttpResponse.json({ access_token: 'access-token', refresh_token: 'refresh-token', expires_in: 300 })
      }),
    )

    await service.onModuleInit()

    expect(client.accessToken).toBe('access-token')
    expect(client.realmName).toBe(projectRealm)
  })

  it('should rethrow when the initial authentication fails', async () => {
    server.use(
      http.post(tokenUrl, () =>
        HttpResponse.json({ error: 'invalid_grant' }, { status: 401 })),
    )

    await expect(service.onModuleInit()).rejects.toThrow('Network response was not OK.')
    expect(client.realmName).toBe('master')
  })

  it('should not authenticate when the Keycloak realm is not configured', async () => {
    const module = await createKeycloakClientServiceTestingModule({ keycloakRealm: undefined }).compile()
    const serviceWithoutRealm = module.get(KeycloakClientService)

    // No token endpoint handler: any authentication attempt would fail the test
    await expect(serviceWithoutRealm.onModuleInit()).resolves.toBeUndefined()
  })

  it('should not authenticate when the admin credentials are not configured', async () => {
    const module = await createKeycloakClientServiceTestingModule({ keycloakAdminPassword: undefined }).compile()
    const serviceWithoutCredentials = module.get(KeycloakClientService)

    await expect(serviceWithoutCredentials.onModuleInit()).resolves.toBeUndefined()
  })
})

describe('getOrCreateSubGroupByName', () => {
  let service: KeycloakClientService

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  beforeEach(async () => {
    const module = await createKeycloakClientServiceTestingModule().compile()
    service = module.get(KeycloakClientService)
    useTokenEndpoint()
    await service.onModuleInit()
  })
  afterEach(() => server.resetHandlers())
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
