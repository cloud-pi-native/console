import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { AdminTokenService } from './admin-token.service'

describe('adminTokenService', () => {
  let module: TestingModule
  let service: AdminTokenService
  let prisma: DeepMockProxy<PrismaService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()

    module = await Test.createTestingModule({
      providers: [
        AdminTokenService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get(AdminTokenService)
  })

  describe('list', () => {
    it('returns active tokens with permissions serialized as string', async () => {
      const tokenId = faker.string.uuid()
      const userId = faker.string.uuid()
      prisma.adminToken.findMany.mockResolvedValue([{
        id: tokenId,
        name: 'my-token',
        permissions: 4n,
        lastUse: null,
        expirationDate: null,
        status: 'active' as const,
        createdAt: new Date(),
        userId,
        hash: 'hash-1',
      }])

      const result = await service.list()

      expect(prisma.adminToken.findMany).toHaveBeenCalled()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(tokenId)
      expect(result[0].permissions).toBe('4')
    })

    it('includes revoked tokens when withRevoked is true', async () => {
      prisma.adminToken.findMany.mockResolvedValue([])

      await service.list(true)

      const callArgs = prisma.adminToken.findMany.mock.calls[0]?.[0]
      expect(callArgs?.where).toEqual({ status: { in: ['active', 'revoked'] } })
    })

    it('filters to active only by default', async () => {
      prisma.adminToken.findMany.mockResolvedValue([])

      await service.list()

      const callArgs = prisma.adminToken.findMany.mock.calls[0]?.[0]
      expect(callArgs?.where).toEqual({ status: 'active' })
    })
  })

  describe('create', () => {
    it('throws BadRequestException if expirationDate is too soon', async () => {
      const today = new Date()
      await expect(service.create({ name: 'x', permissions: '4', expirationDate: today.toISOString() }))
        .rejects.toThrow('Date d\'expiration trop courte')
      expect(prisma.adminToken.create).not.toHaveBeenCalled()
    })

    it('returns created token with plaintext password and serialized permissions', async () => {
      const tokenId = faker.string.uuid()
      const botUserId = faker.string.uuid()
      prisma.user.create.mockResolvedValue({ id: botUserId, firstName: 'Bot Admin', lastName: 'my-token', type: 'bot', email: 'x@bot.io' } as never)
      prisma.adminToken.create.mockResolvedValue({
        id: tokenId,
        name: 'my-token',
        permissions: 2n,
        lastUse: null,
        expirationDate: null,
        status: 'active' as const,
        createdAt: new Date(),
        userId: botUserId,
        hash: 'hash-2',
      })

      const result = await service.create({ name: 'my-token', permissions: '2', expirationDate: null })

      expect(prisma.user.create).toHaveBeenCalled()
      expect(prisma.adminToken.create).toHaveBeenCalled()
      expect(result.id).toBe(tokenId)
      expect(result.password).toBeTruthy()
      expect(result.permissions).toBe('2')
    })
  })

  describe('revoke', () => {
    it('sets status to revoked and expiration date to now', async () => {
      const tokenId = faker.string.uuid()
      prisma.adminToken.updateMany.mockResolvedValue({ count: 1 } as never)

      await service.revoke(tokenId)

      expect(prisma.adminToken.updateMany).toHaveBeenCalledWith({
        where: { id: tokenId },
        data: {
          status: 'revoked',
          expirationDate: expect.any(Date) as Date,
        },
      })
    })
  })
})
