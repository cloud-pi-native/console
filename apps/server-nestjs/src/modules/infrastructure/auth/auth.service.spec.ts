import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { createHash } from 'node:crypto'
import { faker } from '@faker-js/faker'
import { UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../database/prisma.service'
import { makeAdminToken, makePersonalAccessToken } from './auth-testing.utils'
import { AuthService } from './auth.service'
import { KeycloakJwtService } from './keycloak-jwt/keycloak-jwt.service'

describe('authService', () => {
  let module: TestingModule
  let service: AuthService
  let prisma: DeepMockProxy<PrismaService>
  let jwtService: DeepMockProxy<JwtService>
  let keycloakJwtService: DeepMockProxy<KeycloakJwtService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    jwtService = mockDeep<JwtService>()
    keycloakJwtService = mockDeep<KeycloakJwtService>()
    prisma.adminRole.findMany.mockResolvedValue([])

    module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: KeycloakJwtService, useValue: keycloakJwtService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  it('should validate a PersonalAccessToken and return raw token result', async () => {
    const rawToken = faker.string.alphanumeric(32)
    const patMock = makePersonalAccessToken({ adminRoleIds: [faker.string.uuid()] })
    prisma.personalAccessToken.findFirst.mockResolvedValue(patMock)

    const result = await service.validateToken(rawToken, { includeAdminRoleIds: true, includeUserType: true })

    expect(prisma.personalAccessToken.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { hash: createHash('sha256').update(rawToken).digest('hex') } }),
    )
    expect(result).toBeDefined()
    if (result?.kind !== 'personal') throw new Error('Expected personal token result')
    expect(result.ownerAdminRoleIds).toHaveLength(1)
    expect(result.userType).toBe('human')
  })

  it('should validate an AdminToken and return raw token result', async () => {
    const userId = faker.string.uuid()
    prisma.personalAccessToken.findFirst.mockResolvedValue(null)
    prisma.adminToken.findFirst.mockResolvedValue(
      makeAdminToken({
        id: faker.string.uuid(),
        userId,
        permissions: 256n,
      }),
    )

    const result = await service.validateToken(faker.string.alphanumeric(24), { includeAdminRoleIds: true, includeUserType: true })

    expect(result).toBeDefined()
    if (result?.kind !== 'admin') throw new Error('Expected admin token result')
    expect(result.permissions).toBe(256n)
    expect(result.userType).toBe('human')
  })

  it('should return undefined when no token found', async () => {
    prisma.personalAccessToken.findFirst.mockResolvedValue(null)
    prisma.adminToken.findFirst.mockResolvedValue(null)

    const result = await service.validateToken(faker.string.alphanumeric(16), { includeAdminRoleIds: true, includeUserType: true })

    expect(result).toBeUndefined()
  })

  it('should throw 401 when token is inactive', async () => {
    prisma.personalAccessToken.findFirst.mockResolvedValue(
      makePersonalAccessToken({ status: 'revoked', expirationDate: new Date(Date.now() + 86400000) }),
    )

    await expect(service.validateToken(faker.string.alphanumeric(16), { includeAdminRoleIds: true, includeUserType: true })).rejects.toThrow(UnauthorizedException)
  })

  it('should throw 401 when token is expired', async () => {
    prisma.personalAccessToken.findFirst.mockResolvedValue(
      makePersonalAccessToken({ expirationDate: new Date(Date.now() - 1000) }),
    )

    await expect(service.validateToken(faker.string.alphanumeric(16), { includeAdminRoleIds: true, includeUserType: true })).rejects.toThrow(UnauthorizedException)
  })

  it('should update lastUse and lastLogin', async () => {
    const patMock = makePersonalAccessToken({})
    prisma.personalAccessToken.findFirst.mockResolvedValue(patMock)

    await service.validateToken(faker.string.alphanumeric(16), { includeAdminRoleIds: true, includeUserType: true })

    expect(prisma.personalAccessToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: patMock.id }, data: { lastUse: expect.any(String) } }),
    )
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: patMock.owner.id }, data: { lastLogin: expect.any(String) } }),
    )
  })

  it('should authenticate a DSO token from the request header', async () => {
    prisma.personalAccessToken.findFirst.mockResolvedValue(makePersonalAccessToken({}))

    const result = await service.authenticateHeaders({ 'x-dso-token': 'token' })

    expect(typeof result.userId).toBe('string')
    expect(result.userType).toBe('human')
    expect(result.adminPermissions).toBe(0n)
    expect(jwtService.verifyAsync).not.toHaveBeenCalled()
    expect(keycloakJwtService.validatePayload).not.toHaveBeenCalled()
  })

  it('should authenticate a Keycloak bearer token from the request header', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', groups: [] })
    keycloakJwtService.validatePayload.mockResolvedValue({ userId: 'u1', adminPermissions: 8n, userType: 'human' })

    const result = await service.authenticateHeaders({ authorization: 'Bearer jwt-token' })

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('jwt-token')
    expect(keycloakJwtService.validatePayload).toHaveBeenCalledWith(
      { sub: 'u1', groups: [] },
      { includeAdminRoleIds: true, includeUserType: true },
    )
    expect(result).toEqual({ userId: 'u1', adminPermissions: 8n, userType: 'human' })
  })

  it('should throw 401 when no supported auth header exists', async () => {
    await expect(service.authenticateHeaders({})).rejects.toThrow(UnauthorizedException)
  })
})
