import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../../database/prisma.service'
import { makeAuthRequest } from '../auth-testing.utils'
import { makeMockAdminRole, makeMockUser } from './keycloak-jwt-testing.utils'
import { KeycloakJwtService } from './keycloak-jwt.service'

describe('keycloakJwtService', () => {
  let module: TestingModule
  let service: KeycloakJwtService
  let prisma: DeepMockProxy<PrismaService>
  let jwtService: DeepMockProxy<JwtService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    prisma.$transaction.mockImplementation(async fn => fn(prisma))
    jwtService = mockDeep<JwtService>()

    module = await Test.createTestingModule({
      providers: [
        KeycloakJwtService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile()

    service = module.get<KeycloakJwtService>(KeycloakJwtService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
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

      prisma.user.upsert.mockResolvedValue(
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

      expect(prisma.user.update).not.toHaveBeenCalled()
      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ lastLogin: expect.any(String) }),
        }),
      )
      expect(result).toEqual({
        userId: payload.sub,
        adminPermissions: 60n,
        userType: 'human',
      })
    })

    it('should create the local user when missing (first login)', async () => {
      const payload = {
        sub: faker.string.uuid(),
        email: faker.internet.email().toLowerCase(),
        given_name: faker.person.firstName(),
        family_name: faker.person.lastName(),
        groups: ['/current-group'],
      }

      prisma.user.upsert.mockResolvedValue(makeMockUser({ id: payload.sub, email: payload.email }))
      prisma.adminRole.findMany.mockResolvedValue([])

      const result = await service.validatePayload(payload)

      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { id: payload.sub },
        create: {
          id: payload.sub,
          email: payload.email,
          firstName: payload.given_name,
          lastName: payload.family_name,
          adminRoleIds: [],
          type: 'human',
          lastLogin: expect.any(String),
        },
        update: {
          email: payload.email,
          firstName: payload.given_name,
          lastName: payload.family_name,
          lastLogin: expect.any(String),
        },
        select: expect.objectContaining({ id: true, type: true, adminRoleIds: true }),
      })
      expect(prisma.user.update).not.toHaveBeenCalled()
      expect(result).toEqual({
        userId: payload.sub,
        adminPermissions: 0n,
        userType: 'human',
      })
    })

    it('should skip admin role resolution when permissions are not required', async () => {
      const payload = {
        sub: faker.string.uuid(),
        email: faker.internet.email().toLowerCase(),
        given_name: faker.person.firstName(),
        family_name: faker.person.lastName(),
        groups: ['/current-group'],
      }

      prisma.user.upsert.mockResolvedValue(
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
      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ lastLogin: expect.any(String) }),
        }),
      )
      expect(result).toEqual({
        userId: payload.sub,
        adminPermissions: undefined,
        userType: 'human',
      })
    })
  })

  describe('resolveAdminPermissions', () => {
    it('should match external roles by group, managed roles by persisted ids and globals always (parity with logViaSession)', async () => {
      prisma.user.upsert.mockResolvedValue(makeMockUser({ adminRoleIds: ['managed-role'] }))
      prisma.adminRole.findMany.mockResolvedValue([])

      await service.validatePayload({
        sub: faker.string.uuid(),
        email: '',
        given_name: '',
        family_name: '',
        groups: ['/admin'],
      })

      expect(prisma.adminRole.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { oidcGroup: { in: ['/admin'] } },
            { id: { in: ['managed-role'] } },
            { type: 'global' },
          ],
        },
        orderBy: { position: 'asc' },
      })
    })
  })

  describe('authenticate', () => {
    it('should authenticate a bearer token from the request', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: faker.string.uuid(),
        email: faker.internet.email().toLowerCase(),
        given_name: faker.person.firstName(),
        family_name: faker.person.lastName(),
        groups: [],
      })
      prisma.user.upsert.mockResolvedValue(makeMockUser({}))
      prisma.adminRole.findMany.mockResolvedValue([])

      const result = await service.authenticate(
        makeAuthRequest({ authorization: 'Bearer jwt-token' }),
      )

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('jwt-token')
      expect(result?.userId).toBeDefined()
    })
  })
})
