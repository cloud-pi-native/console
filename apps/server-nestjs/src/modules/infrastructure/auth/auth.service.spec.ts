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
    prisma.adminRole.findMany.mockResolvedValue([])
    jwtService = mockDeep<JwtService>()
    keycloakJwtService = mockDeep<KeycloakJwtService>()

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

  it('should validate a PersonalAccessToken and return permissions from user roles', async () => {
    const rawToken = faker.string.alphanumeric(32)
    const userId = faker.string.uuid()
    prisma.personalAccessToken.findFirst.mockResolvedValue({
      id: faker.string.uuid(),
      name: 'test-token',
      status: 'active',
      expirationDate: new Date(Date.now() + 86400000),
      lastUse: null,
      createdAt: new Date(),
      hash: faker.string.hexadecimal({ length: 64 }),
      userId,
      owner: { id: userId, adminRoleIds: [faker.string.uuid()] },
    } as any)
    prisma.adminRole.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: faker.string.uuid(), name: 'role', permissions: 4n, position: 1, oidcGroup: '', type: 'managed' }])

    const result = await service.validateToken(rawToken)

    expect(prisma.personalAccessToken.findFirst).toHaveBeenCalledWith({
      where: { hash: createHash('sha256').update(rawToken).digest('hex') },
      include: { owner: true },
    })
    expect(result.userId).toBe(userId)
    expect(result.adminPermissions).toBe(4n)
  })

  it('should validate an AdminToken and use token.permissions directly', async () => {
    const userId = faker.string.uuid()
    prisma.personalAccessToken.findFirst.mockResolvedValue(null)
    prisma.adminToken.findFirst.mockResolvedValue({
      id: faker.string.uuid(),
      name: 'admin-token',
      status: 'active',
      expirationDate: null,
      permissions: 256n,
      lastUse: null,
      createdAt: new Date(),
      hash: faker.string.hexadecimal({ length: 64 }),
      userId,
      owner: { id: userId, adminRoleIds: [] },
    } as any)
    prisma.adminRole.findMany.mockResolvedValue([])

    const result = await service.validateToken(faker.string.alphanumeric(24))

    expect(result.adminPermissions).toBe(256n)
  })

  it('should OR global role permissions with token permissions', async () => {
    const userId = faker.string.uuid()
    prisma.personalAccessToken.findFirst.mockResolvedValue(null)
    prisma.adminToken.findFirst.mockResolvedValue({
      id: faker.string.uuid(),
      name: 'admin-token',
      status: 'active',
      expirationDate: null,
      permissions: 256n,
      lastUse: null,
      createdAt: new Date(),
      hash: faker.string.hexadecimal({ length: 64 }),
      userId,
      owner: { id: userId, adminRoleIds: [] },
    } as any)
    prisma.adminRole.findMany.mockResolvedValue([{ id: faker.string.uuid(), name: 'global', permissions: 1n, position: 0, oidcGroup: '', type: 'global' }])

    const result = await service.validateToken(faker.string.alphanumeric(24))

    expect(result.adminPermissions).toBe(257n)
  })

  it('should throw 401 when no token found', async () => {
    prisma.personalAccessToken.findFirst.mockResolvedValue(null)
    prisma.adminToken.findFirst.mockResolvedValue(null)

    await expect(service.validateToken(faker.string.alphanumeric(16))).rejects.toThrow(UnauthorizedException)
  })

  it('should throw 401 when token is inactive', async () => {
    prisma.personalAccessToken.findFirst.mockResolvedValue({
      id: faker.string.uuid(),
      name: 'test-token',
      status: 'revoked',
      expirationDate: new Date(Date.now() + 86400000),
      lastUse: null,
      createdAt: new Date(),
      hash: faker.string.hexadecimal({ length: 64 }),
      userId: faker.string.uuid(),
      owner: { id: faker.string.uuid(), adminRoleIds: [] },
    } as any)

    await expect(service.validateToken(faker.string.alphanumeric(16))).rejects.toThrow(UnauthorizedException)
  })

  it('should throw 401 when token is expired', async () => {
    prisma.personalAccessToken.findFirst.mockResolvedValue({
      id: faker.string.uuid(),
      name: 'test-token',
      status: 'active',
      expirationDate: new Date(Date.now() - 1000),
      lastUse: null,
      createdAt: new Date(),
      hash: faker.string.hexadecimal({ length: 64 }),
      userId: faker.string.uuid(),
      owner: { id: faker.string.uuid(), adminRoleIds: [] },
    } as any)

    await expect(service.validateToken(faker.string.alphanumeric(16))).rejects.toThrow(UnauthorizedException)
  })

  it('should update lastUse and lastLogin', async () => {
    const userId = faker.string.uuid()
    const tokenId = faker.string.uuid()
    prisma.personalAccessToken.findFirst.mockResolvedValue({
      id: tokenId,
      name: 'test-token',
      status: 'active',
      expirationDate: new Date(Date.now() + 86400000),
      lastUse: null,
      createdAt: new Date(),
      hash: faker.string.hexadecimal({ length: 64 }),
      userId,
      owner: { id: userId, adminRoleIds: [] },
    } as any)
    prisma.adminRole.findMany.mockResolvedValue([])

    await service.validateToken(faker.string.alphanumeric(16))

    expect(prisma.personalAccessToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: tokenId }, data: { lastUse: expect.any(String) } }),
    )
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: userId }, data: { lastLogin: expect.any(String) } }),
    )
  })

  it('should authenticate a DSO token from the request header', async () => {
    const userId = faker.string.uuid()
    prisma.personalAccessToken.findFirst.mockResolvedValue({
      id: faker.string.uuid(),
      name: 'test-token',
      status: 'active',
      expirationDate: new Date(Date.now() + 86400000),
      lastUse: null,
      createdAt: new Date(),
      hash: faker.string.hexadecimal({ length: 64 }),
      userId,
      owner: { id: userId, adminRoleIds: [] },
    } as any)
    prisma.adminRole.findMany.mockResolvedValue([])

    const result = await service.authenticateHeaders({ 'x-dso-token': 'token' })

    expect(result.userId).toBe(userId)
    expect(jwtService.verifyAsync).not.toHaveBeenCalled()
    expect(keycloakJwtService.validatePayload).not.toHaveBeenCalled()
  })

  it('should authenticate a Keycloak bearer token from the request header', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', groups: [] })
    keycloakJwtService.validatePayload.mockResolvedValue({ userId: 'u1', adminPermissions: 8n })

    const result = await service.authenticateHeaders({ authorization: 'Bearer jwt-token' })

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('jwt-token')
    expect(keycloakJwtService.validatePayload).toHaveBeenCalledWith({ sub: 'u1', groups: [] })
    expect(result).toEqual({ userId: 'u1', adminPermissions: 8n })
  })

  it('should throw 401 when no supported auth header exists', async () => {
    await expect(service.authenticateHeaders({})).rejects.toThrow(UnauthorizedException)
  })
})
