import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { createHash } from 'node:crypto'
import { UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../database/prisma.service'
import { AuthService } from './auth.service'

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

const mockUser = { id: 'user-1', adminRoleIds: ['role-1'] }

describe('authService', () => {
  let module: TestingModule
  let service: AuthService
  let prisma: DeepMockProxy<PrismaService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    prisma.adminRole.findMany.mockResolvedValue([])

    module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  it('should validate a PersonalAccessToken and return permissions from user roles', async () => {
    const rawToken = 'my-token'
    prisma.personalAccessToken.findFirst.mockResolvedValue({
      id: 'pat-1',
      status: 'active',
      expirationDate: new Date(Date.now() + 86400000),
      owner: mockUser,
    })
    prisma.adminRole.findMany
      .mockResolvedValueOnce([]) // global roles
      .mockResolvedValueOnce([{ permissions: 4n }]) // user roles

    const result = await service.validateToken(rawToken)

    expect(prisma.personalAccessToken.findFirst).toHaveBeenCalledWith({
      where: { hash: sha256(rawToken) },
      include: { owner: true },
    })
    expect(result.userId).toBe('user-1')
    expect(result.adminPermissions).toBe(4n)
  })

  it('should validate an AdminToken and use token.permissions directly', async () => {
    prisma.personalAccessToken.findFirst.mockResolvedValue(null)
    prisma.adminToken.findFirst.mockResolvedValue({
      id: 'at-1',
      status: 'active',
      expirationDate: null,
      permissions: 256n, // MANAGE_SYSTEM
      owner: mockUser,
    })
    prisma.adminRole.findMany.mockResolvedValue([]) // global roles

    const result = await service.validateToken('admin-tok')

    expect(result.adminPermissions).toBe(256n)
  })

  it('should OR global role permissions with token permissions', async () => {
    prisma.personalAccessToken.findFirst.mockResolvedValue(null)
    prisma.adminToken.findFirst.mockResolvedValue({
      id: 'at-1',
      status: 'active',
      expirationDate: null,
      permissions: 256n,
      owner: mockUser,
    })
    prisma.adminRole.findMany.mockResolvedValue([{ permissions: 1n }]) // global role with LIST

    const result = await service.validateToken('tok')

    expect(result.adminPermissions).toBe(257n) // 256n | 1n
  })

  it('should throw 401 when no token found', async () => {
    prisma.personalAccessToken.findFirst.mockResolvedValue(null)
    prisma.adminToken.findFirst.mockResolvedValue(null)

    await expect(service.validateToken('unknown')).rejects.toThrow(UnauthorizedException)
  })

  it('should throw 401 when token is inactive', async () => {
    prisma.personalAccessToken.findFirst.mockResolvedValue({
      id: 'pat-1',
      status: 'revoked',
      expirationDate: null,
      owner: mockUser,
    })

    await expect(service.validateToken('revoked-tok')).rejects.toThrow(UnauthorizedException)
  })

  it('should throw 401 when token is expired', async () => {
    prisma.personalAccessToken.findFirst.mockResolvedValue({
      id: 'pat-1',
      status: 'active',
      expirationDate: new Date(Date.now() - 1000),
      owner: mockUser,
    })

    await expect(service.validateToken('expired-tok')).rejects.toThrow(UnauthorizedException)
  })

  it('should update lastUse and lastLogin', async () => {
    prisma.personalAccessToken.findFirst.mockResolvedValue({
      id: 'pat-1',
      status: 'active',
      expirationDate: null,
      owner: mockUser,
    })
    prisma.adminRole.findMany.mockResolvedValue([])

    await service.validateToken('tok')

    expect(prisma.personalAccessToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pat-1' }, data: { lastUse: expect.any(String) } }),
    )
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' }, data: { lastLogin: expect.any(String) } }),
    )
  })
})
