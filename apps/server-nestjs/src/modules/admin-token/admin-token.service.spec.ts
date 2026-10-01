import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { BadRequestException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { makeAdminTokenRecord } from './admin-token-testing.utils'
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
    it('returns raw token records', async () => {
      const token = makeAdminTokenRecord()
      prisma.adminToken.findMany.mockResolvedValue([token])

      const result = await service.list()

      expect(prisma.adminToken.findMany).toHaveBeenCalled()
      expect(result).toEqual([token])
    })

    it('includes revoked tokens when withRevoked is true', async () => {
      prisma.adminToken.findMany.mockResolvedValue([])

      await service.list(true)

      expect(prisma.adminToken.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { status: { in: ['active', 'revoked'] } },
      }))
    })

    it('filters to active only by default', async () => {
      prisma.adminToken.findMany.mockResolvedValue([])

      await service.list()

      expect(prisma.adminToken.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { status: 'active' },
      }))
    })
  })

  describe('create', () => {
    it('rejects an expiration date before tomorrow', async () => {
      await expect(service.create({ name: 'my-token', permissions: '4', expirationDate: new Date() }))
        .rejects.toThrow(BadRequestException)
      await expect(service.create({ name: 'my-token', permissions: '4', expirationDate: new Date() }))
        .rejects.toThrow('Date d\'expiration trop courte')
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('returns created token with plaintext password and serialized permissions', async () => {
      const tokenId = faker.string.uuid()
      const botUserId = faker.string.uuid()
      const tx = mockDeep<PrismaService>()
      tx.user.create.mockResolvedValue({
        id: botUserId,
        firstName: 'Bot Admin',
        lastName: 'my-token',
        email: `${botUserId}@bot.io`,
        createdAt: faker.date.past(),
        updatedAt: faker.date.past(),
        lastLogin: null,
        adminRoleIds: [],
        type: 'bot',
      })
      const created = makeAdminTokenRecord({ id: tokenId, userId: botUserId, permissions: 2n })
      tx.adminToken.create.mockResolvedValue(created)
      prisma.$transaction.mockImplementation(async fn => fn(tx))

      const result = await service.create({ name: 'my-token', permissions: '2', expirationDate: null })

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function))
      expect(tx.user.create).toHaveBeenCalled()
      expect(tx.adminToken.create).toHaveBeenCalled()
      expect(result.id).toBe(tokenId)
      expect(result.password).toBeTruthy()
      expect(result.permissions).toBe('2')
    })
  })

  describe('revoke', () => {
    it('sets status to revoked and expiration date to now', async () => {
      const tokenId = faker.string.uuid()
      prisma.adminToken.updateMany.mockResolvedValue({ count: 1 })

      await service.revoke(tokenId)

      expect(prisma.adminToken.updateMany).toHaveBeenCalledWith({
        where: { id: tokenId },
        data: { status: 'revoked', expirationDate: expect.any(Date) },
      })
    })
  })
})
