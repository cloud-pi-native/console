import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationService } from '../../configuration/configuration.service'
import { KeycloakJwtClientService } from './keycloak-jwt-client.service'
import { makeJwksResponse } from './keycloak-jwt-testing.utils'

describe('keycloakJwtClientService', () => {
  let module: TestingModule
  let service: KeycloakJwtClientService
  let config: DeepMockProxy<ConfigurationService>
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    config = mockDeep<ConfigurationService>({
      keycloakProtocol: 'https',
      keycloakDomain: faker.internet.domainName(),
      keycloakRealm: faker.lorem.word(),
      keycloakJwksTimeoutMs: 1_000,
    })
    config.getKeycloakIssuer.mockReturnValue(`https://${config.keycloakDomain}/realms/${config.keycloakRealm}`)
    config.getKeycloakCertsUrl.mockReturnValue(
      `https://${config.keycloakDomain}/realms/${config.keycloakRealm}/protocol/openid-connect/certs`,
    )
    fetchMock = vi.fn()

    vi.clearAllMocks()
    vi.unstubAllGlobals()
    vi.stubGlobal('fetch', fetchMock)

    module = await Test.createTestingModule({
      providers: [
        KeycloakJwtClientService,
        { provide: ConfigurationService, useValue: config },
      ],
    }).compile()

    service = module.get(KeycloakJwtClientService)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should fetch JWKS from Keycloak and parse the response', async () => {
    fetchMock.mockResolvedValueOnce(makeJwksResponse('kid-1'))

    const jwks = await service.fetchJwks()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `https://${config.keycloakDomain}/realms/${config.keycloakRealm}/protocol/openid-connect/certs`,
    )
    expect(jwks).toEqual({
      keys: [
        {
          kid: 'kid-1',
          kty: 'RSA',
          use: 'sig',
          n: expect.any(String),
          e: expect.any(String),
        },
      ],
    })
  })

  it('should abort and return undefined when the JWKS request exceeds the timeout', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementationOnce((_url, init?: RequestInit) => new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))

    const promise = service.fetchJwks()
    await vi.advanceTimersByTimeAsync(1_000)

    await expect(promise).resolves.toBeUndefined()
  })

  it('should return undefined when Keycloak returns a non-OK response', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500, statusText: 'Internal Server Error' }))

    await expect(service.fetchJwks()).resolves.toBeUndefined()
  })
})
