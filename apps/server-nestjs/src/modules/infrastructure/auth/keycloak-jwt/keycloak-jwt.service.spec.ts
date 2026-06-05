import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { UnauthorizedException } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { createCache } from 'cache-manager'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationService } from '../../configuration/configuration.service'
import { PrismaService } from '../../database/prisma.service'
import { KeycloakJwtClientService } from './keycloak-jwt-client.service'
import { makeMockAdminRole, makeMockUser } from './keycloak-jwt-testing.utils'
import { KeycloakJwtService } from './keycloak-jwt.service'

describe('keycloakJwtService', () => {
  let module: TestingModule
  let service: KeycloakJwtService
  let config: DeepMockProxy<ConfigurationService>
  let prisma: DeepMockProxy<PrismaService>
  let client: DeepMockProxy<KeycloakJwtClientService>
  let jwtService: DeepMockProxy<JwtService>
  let moduleRef: DeepMockProxy<ModuleRef>
  let cache: ReturnType<typeof createCache>

  beforeEach(async () => {
    config = mockDeep<ConfigurationService>({
      keycloakProtocol: 'https',
      keycloakDomain: faker.internet.domainName(),
      keycloakRealm: faker.lorem.word(),
      keycloakClientId: faker.string.alphanumeric(12),
      keycloakJwksCacheTtlMs: 300_000,
      keycloakJwksTimeoutMs: 1_000,
    })
    config.getKeycloakIssuer.mockReturnValue(`https://${config.keycloakDomain}/realms/${config.keycloakRealm}`)
    config.getKeycloakCertsUrl.mockReturnValue(
      `https://${config.keycloakDomain}/realms/${config.keycloakRealm}/protocol/openid-connect/certs`,
    )
    prisma = mockDeep<PrismaService>()
    client = mockDeep<KeycloakJwtClientService>()
    jwtService = mockDeep<JwtService>()
    moduleRef = mockDeep<ModuleRef>()
    moduleRef.get.mockReturnValue(jwtService)
    cache = createCache()

    module = await Test.createTestingModule({
      providers: [
        KeycloakJwtService,
        { provide: ConfigurationService, useValue: config },
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cache },
        { provide: KeycloakJwtClientService, useValue: client },
        { provide: JwtService, useValue: jwtService },
        { provide: ModuleRef, useValue: moduleRef },
      ],
    }).compile()

    service = module.get<KeycloakJwtService>(KeycloakJwtService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('decodeJweHeader', () => {
    it('should return null for non-string input', () => {
      expect(service.decodeJweHeader({})).toBeNull()
      expect(service.decodeJweHeader(Buffer.from('test'))).toBeNull()
    })

    it('should return null for malformed token', () => {
      expect(service.decodeJweHeader('not-a-jwt')).toBeNull()
      expect(service.decodeJweHeader('only.two')).toBeNull()
    })

    it('should return null when header has no kid', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url')
      expect(service.decodeJweHeader(`${header}.payload.sig`)).toBeNull()
    })

    it('should extract kid from valid header', () => {
      const kid = faker.string.alphanumeric(12)
      const header = Buffer.from(JSON.stringify({ kid, alg: 'RS256' })).toString('base64url')
      expect(service.decodeJweHeader(`${header}.payload.sig`)).toEqual({ kid })
    })

    it('should return null for invalid base64', () => {
      expect(service.decodeJweHeader('!!!.payload.sig')).toBeNull()
    })
  })

  describe('validatePayload', () => {
    it('should recompute active admin roles from the current Keycloak group membership', async () => {
      const payload = {
        sub: faker.string.uuid(),
        email: faker.internet.email().toLowerCase(),
        given_name: faker.person.firstName(),
        family_name: faker.person.lastName(),
        groups: ['/current-group'],
      }

      prisma.user.findUnique.mockResolvedValue(
        makeMockUser({
          id: payload.sub,
          adminRoleIds: ['stale-oidc-role', 'manual-role'],
        }),
      )
      prisma.adminRole.findMany.mockResolvedValue([
        makeMockAdminRole({
          id: 'stale-oidc-role',
          oidcGroup: '/stale-group',
          permissions: 8n,
          type: 'managed',
        }),
        makeMockAdminRole({
          id: 'manual-role',
          oidcGroup: '',
          permissions: 16n,
          type: 'managed',
        }),
        makeMockAdminRole({
          id: 'current-oidc-role',
          oidcGroup: '/current-group',
          permissions: 32n,
          type: 'managed',
        }),
        makeMockAdminRole({
          id: 'global-role',
          oidcGroup: '',
          permissions: 4n,
          type: 'global',
        }),
      ])

      const result = await service.validatePayload(payload)

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: payload.sub },
        data: {
          adminRoleIds: ['manual-role', 'current-oidc-role', 'global-role'],
          lastLogin: expect.any(String),
        },
      })
      expect(result).toEqual({
        userId: payload.sub,
        adminPermissions: 52n,
        userType: 'human',
      })
    })

    it('should reject when the local user is missing', async () => {
      const payload = {
        sub: faker.string.uuid(),
        email: faker.internet.email().toLowerCase(),
        given_name: faker.person.firstName(),
        family_name: faker.person.lastName(),
        groups: ['/current-group'],
      }

      prisma.user.findUnique.mockResolvedValue(null)

      await expect(service.validatePayload(payload)).rejects.toBeInstanceOf(UnauthorizedException)
      expect(prisma.adminRole.findMany).not.toHaveBeenCalled()
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('should skip admin role resolution when permissions are not required', async () => {
      const payload = {
        sub: faker.string.uuid(),
        email: faker.internet.email().toLowerCase(),
        given_name: faker.person.firstName(),
        family_name: faker.person.lastName(),
        groups: ['/current-group'],
      }

      prisma.user.findUnique.mockResolvedValue(
        makeMockUser({
          id: payload.sub,
          type: 'human',
        }),
      )

      const result = await service.validatePayload(
        payload,
        { includeAdminRoleIds: false, includeUserType: true },
      )

      expect(prisma.adminRole.findMany).not.toHaveBeenCalled()
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: payload.sub },
        data: {
          lastLogin: expect.any(String),
        },
      })
      expect(result).toEqual({
        userId: payload.sub,
        adminPermissions: undefined,
        userType: 'human',
      })
    })
  })

  describe('authenticate', () => {
    it('should authenticate a bearer token from the request', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: faker.string.uuid(), groups: [] })
      prisma.user.findUnique.mockResolvedValue(makeMockUser({}))
      prisma.adminRole.findMany.mockResolvedValue([])

      const result = await service.authenticate(
        { headers: { authorization: 'Bearer jwt-token' } } as Parameters<KeycloakJwtService['authenticate']>[0],
      )

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('jwt-token')
      expect(result?.userId).toBeDefined()
    })
  })

  describe('getPublicKey', () => {
    it('should fetch and cache JWKS when the requested key id is missing', async () => {
      await cache.set('jwks:kids', ['old-kid'])
      client.fetchJwks.mockResolvedValue({
        keys: [
          { kid: 'new-kid', kty: 'RSA', use: 'sig', n: 'n', e: 'e' },
        ],
      })

      const publicKey = await service.getPublicKey('new-kid')

      expect(client.fetchJwks).toHaveBeenCalledTimes(1)
      expect(publicKey).toContain('BEGIN RSA PUBLIC KEY')
      expect(await cache.get('jwks:new-kid')).toBe(publicKey)
    })

    it('should return the cached key without fetching Keycloak', async () => {
      await cache.set('jwks:kids', ['cached-kid'])
      await cache.set('jwks:cached-kid', '-----BEGIN RSA PUBLIC KEY-----\ncached\n-----END RSA PUBLIC KEY-----')

      const publicKey = await service.getPublicKey('cached-kid')

      expect(client.fetchJwks).not.toHaveBeenCalled()
      expect(publicKey).toBe('-----BEGIN RSA PUBLIC KEY-----\ncached\n-----END RSA PUBLIC KEY-----')
    })

    it('should refresh cached keys after rotation', async () => {
      await cache.set('jwks:kids', ['old-kid'])
      await cache.set('jwks:old-kid', '-----BEGIN RSA PUBLIC KEY-----\nold\n-----END RSA PUBLIC KEY-----')

      client.fetchJwks.mockResolvedValue({
        keys: [
          { kid: 'rotated-kid', kty: 'RSA', use: 'sig', n: 'rotated-n', e: 'rotated-e' },
        ],
      })

      const publicKey = await service.getPublicKey('rotated-kid')

      expect(client.fetchJwks).toHaveBeenCalledTimes(1)
      expect(publicKey).toContain('BEGIN RSA PUBLIC KEY')
      expect(await cache.get('jwks:rotated-kid')).toBe(publicKey)
      expect(await cache.get('jwks:kids')).toEqual(['rotated-kid'])
    })

    it('should return undefined when JWKS cannot be refreshed', async () => {
      client.fetchJwks.mockResolvedValue(undefined)

      const publicKey = await service.getPublicKey('missing-kid')

      expect(publicKey).toBeUndefined()
    })
  })
})
