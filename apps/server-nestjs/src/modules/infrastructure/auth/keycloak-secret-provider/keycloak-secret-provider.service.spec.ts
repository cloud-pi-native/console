import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { JwtSecretRequestType } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { createCache } from 'cache-manager'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationService } from '../../configuration/configuration.service'
import { makeJwksResponse } from './keycloak-secret-provider-testing.utils'
import { KeycloakSecretProviderService } from './keycloak-secret-provider.service'
import { createKeycloakSecretProviderPublicKeyCacheKey } from './keycloak-secret-provider.utils'

describe('keycloakSecretProviderService', () => {
  let module: TestingModule
  let service: KeycloakSecretProviderService
  let config: DeepMockProxy<ConfigurationService>
  let fetchMock: ReturnType<typeof vi.fn>
  let cache: ReturnType<typeof createCache>

  beforeEach(async () => {
    config = mockDeep<ConfigurationService>({
      keycloakProtocol: 'https',
      keycloakDomain: faker.internet.domainName(),
      keycloakRealm: faker.lorem.word(),
      keycloakJwksTimeoutMs: 1_000,
      keycloakJwksCacheTtlMs: 300_000,
      keycloakOpenidConfigurationCacheTtlMs: 300_000,

      getKeycloakOpenidConfigurationUrl() {
        return `https://${this.keycloakDomain}/realms/${this.keycloakRealm}/.well-known/openid-configuration`
      },
    })
    fetchMock = vi.fn()
    cache = createCache()

    vi.clearAllMocks()
    vi.unstubAllGlobals()
    vi.stubGlobal('fetch', fetchMock)

    module = await Test.createTestingModule({
      providers: [
        KeycloakSecretProviderService,
        { provide: ConfigurationService, useValue: config },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile()

    service = module.get(KeycloakSecretProviderService)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should fetch JWKS from Keycloak and parse the response', async () => {
    const issuer = `https://${config.keycloakDomain}/realms/${config.keycloakRealm}`
    const publicJwksUri = `https://public.${config.keycloakDomain}/realms/${config.keycloakRealm}/protocol/openid-connect/certs`
    const internalJwksUri = `https://${config.keycloakDomain}/realms/${config.keycloakRealm}/protocol/openid-connect/certs`
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ issuer, jwks_uri: publicJwksUri })))
    fetchMock.mockResolvedValueOnce(makeJwksResponse('kid-1'))

    const jwks = await service.fetchSigningKeys()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `https://${config.keycloakDomain}/realms/${config.keycloakRealm}/.well-known/openid-configuration`,
    )
    expect(fetchMock.mock.calls[1]?.[0]).toBe(internalJwksUri)
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
    const issuer = `https://${config.keycloakDomain}/realms/${config.keycloakRealm}`
    const publicJwksUri = `https://public.${config.keycloakDomain}/realms/${config.keycloakRealm}/protocol/openid-connect/certs`
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ issuer, jwks_uri: publicJwksUri })))
    fetchMock.mockImplementationOnce((_url, init?: RequestInit) => new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))

    const promise = service.fetchSigningKeys()
    await vi.advanceTimersByTimeAsync(1_000)

    await expect(promise).resolves.toBeUndefined()
  })

  it('should return undefined when Keycloak returns a non-OK response', async () => {
    const issuer = `https://${config.keycloakDomain}/realms/${config.keycloakRealm}`
    const publicJwksUri = `https://public.${config.keycloakDomain}/realms/${config.keycloakRealm}/protocol/openid-connect/certs`
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ issuer, jwks_uri: publicJwksUri })))
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500, statusText: 'Internal Server Error' }))

    await expect(service.fetchSigningKeys()).resolves.toBeUndefined()
  })

  it('should resolve a PEM public key from the JWKS', async () => {
    const issuer = `https://${config.keycloakDomain}/realms/${config.keycloakRealm}`
    const publicJwksUri = `https://public.${config.keycloakDomain}/realms/${config.keycloakRealm}/protocol/openid-connect/certs`
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ issuer, jwks_uri: publicJwksUri })))
    fetchMock.mockResolvedValueOnce(makeJwksResponse('kid-2'))

    const publicKey = await service.fetchPublicKey('kid-2')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(publicKey).toContain('BEGIN RSA PUBLIC KEY')
    expect(await cache.get(createKeycloakSecretProviderPublicKeyCacheKey('kid-2'))).toBe(publicKey)
  })

  it('should reuse the cached PEM public key', async () => {
    await cache.set(
      createKeycloakSecretProviderPublicKeyCacheKey('cached-kid'),
      '-----BEGIN RSA PUBLIC KEY-----\ncached\n-----END RSA PUBLIC KEY-----',
    )

    const publicKey = await service.fetchPublicKey('cached-kid')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(publicKey).toBe('-----BEGIN RSA PUBLIC KEY-----\ncached\n-----END RSA PUBLIC KEY-----')
  })

  it('should resolve the secret directly from the JWT token and request type', async () => {
    const issuer = `https://${config.keycloakDomain}/realms/${config.keycloakRealm}`
    const publicJwksUri = `https://public.${config.keycloakDomain}/realms/${config.keycloakRealm}/protocol/openid-connect/certs`
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ issuer, jwks_uri: publicJwksUri })))
    fetchMock.mockResolvedValueOnce(makeJwksResponse('kid-3'))
    const header = Buffer.from(JSON.stringify({ kid: 'kid-3' })).toString('base64url')

    const secret = await service.getSecret(JwtSecretRequestType.VERIFY, `${header}.payload.sig`)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(secret).toContain('BEGIN RSA PUBLIC KEY')
  })

  it('should reject signing requests', async () => {
    await expect(service.getSecret(JwtSecretRequestType.SIGN, 'payload')).rejects.toThrow('Signing is not supported')
  })

  it('should reject non-string tokens', async () => {
    await expect(service.getSecret(JwtSecretRequestType.VERIFY, Buffer.from('payload'))).rejects.toThrow(
      'Unsupported token type',
    )
  })

  it('should reject malformed JWTs', async () => {
    await expect(service.getSecret(JwtSecretRequestType.VERIFY, 'only.two')).rejects.toThrow('Invalid JWT format')
  })

  it('should reject JWTs without a kid header', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url')

    await expect(service.getSecret(JwtSecretRequestType.VERIFY, `${header}.payload.sig`)).rejects.toThrow(
      'Missing kid',
    )
  })

  it('should reject JWTs when the key cannot be resolved', async () => {
    const issuer = `https://${config.keycloakDomain}/realms/${config.keycloakRealm}`
    const publicJwksUri = `https://public.${config.keycloakDomain}/realms/${config.keycloakRealm}/protocol/openid-connect/certs`
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ issuer, jwks_uri: publicJwksUri })))
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ keys: [] })))
    const header = Buffer.from(JSON.stringify({ kid: 'missing-kid' })).toString('base64url')

    await expect(service.getSecret(JwtSecretRequestType.VERIFY, `${header}.payload.sig`)).rejects.toThrow(
      'Unknown signing key',
    )
  })

  it('should resolve the issuer from openid-configuration', async () => {
    const issuer = `https://${config.keycloakDomain}/realms/${config.keycloakRealm}`
    const publicJwksUri = `https://public.${config.keycloakDomain}/realms/${config.keycloakRealm}/protocol/openid-connect/certs`
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ issuer, jwks_uri: publicJwksUri })))

    await expect(service.fetchIssuer()).resolves.toBe(issuer)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('should replace the discovered JWKS domain with the configured internal Keycloak domain', async () => {
    const publicJwksUri = `https://public.${config.keycloakDomain}/realms/${config.keycloakRealm}/protocol/openid-connect/certs`
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      issuer: `https://${config.keycloakDomain}/realms/${config.keycloakRealm}`,
      jwks_uri: publicJwksUri,
    })))

    await expect(service.fetchJwksUri()).resolves.toBe(
      `https://${config.keycloakDomain}/realms/${config.keycloakRealm}/protocol/openid-connect/certs`,
    )
  })

  it('should keep the discovered JWKS URI unchanged when no internal Keycloak domain is configured', async () => {
    config.keycloakDomain = undefined
    const publicJwksUri = `https://public.example.test/realms/${config.keycloakRealm}/protocol/openid-connect/certs`
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      issuer: 'https://public.example.test/realms/test',
      jwks_uri: publicJwksUri,
    })))

    await expect(service.fetchJwksUri()).resolves.toBe(publicJwksUri)
  })
})
