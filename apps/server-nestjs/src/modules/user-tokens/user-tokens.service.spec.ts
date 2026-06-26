import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { userTokenSelect } from './user-tokens-queries.utils'
import { UserTokensService } from './user-tokens.service'

describe('userTokensService', () => {
  let module: TestingModule
  let service: UserTokensService
  let prisma: DeepMockProxy<PrismaService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()

    module = await Test.createTestingModule({
      providers: [
        UserTokensService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get(UserTokensService)
  })

  describe('list', () => {
    it('returns user tokens ordered by status then creation date', async () => {
      const userId = faker.string.uuid()
      const tokenId = faker.string.uuid()
      prisma.personalAccessToken.findMany.mockResolvedValue([{
        id: tokenId,
        name: 'my-token',
        lastUse: null,
        expirationDate: new Date(),
        status: 'active' as const,
        createdAt: new Date(),
        userId,
        hash: 'hash-1',
      }])

      const result = await service.list(userId)

      expect(prisma.personalAccessToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId } }),
      )
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(tokenId)
    })

    it('selects only exposed token fields', async () => {
      const userId = faker.string.uuid()
      prisma.personalAccessToken.findMany.mockResolvedValue([])

      await service.list(userId)

      const callArgs = prisma.personalAccessToken.findMany.mock.calls[0]?.[0]
      expect(callArgs?.select).toEqual(userTokenSelect)
    })
  })

  describe('create', () => {
    it('throws BadRequestException if expirationDate is too soon', async () => {
      const userId = faker.string.uuid()
      const today = new Date()
      await expect(service.create({ name: 'x', expirationDate: today.toISOString() }, userId))
        .rejects.toThrow('Date d\'expiration trop courte')
      expect(prisma.personalAccessToken.create).not.toHaveBeenCalled()
    })

    it('returns created token with plaintext password', async () => {
      const userId = faker.string.uuid()
      const tokenId = faker.string.uuid()
      prisma.personalAccessToken.create.mockResolvedValue({
        id: tokenId,
        name: 'my-token',
        lastUse: null,
        expirationDate: new Date(),
        status: 'active' as const,
        createdAt: new Date(),
        userId,
        hash: 'hash-2',
      })

      const result = await service.create({ name: 'my-token', expirationDate: '2099-01-01' }, userId)

      expect(prisma.personalAccessToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            name: 'my-token',
          }),
          select: userTokenSelect,
        }),
      )
      expect(result.id).toBe(tokenId)
      expect(result.password).toBeTruthy()
    })
  })

  describe('delete', () => {
    it('deletes token if it exists and belongs to user', async () => {
      const tokenId = faker.string.uuid()
      const userId = faker.string.uuid()
      prisma.personalAccessToken.findUnique.mockResolvedValue({ id: tokenId, userId } as never)
      prisma.personalAccessToken.delete.mockResolvedValue({ id: tokenId } as never)

      await service.delete(tokenId, userId)

      expect(prisma.personalAccessToken.findUnique).toHaveBeenCalledWith({
        where: { id: tokenId, userId },
      })
      expect(prisma.personalAccessToken.delete).toHaveBeenCalledWith({ where: { id: tokenId } })
    })

    it('does nothing if token not found or belongs to other user', async () => {
      prisma.personalAccessToken.findUnique.mockResolvedValue(null)

      await service.delete('unknown', 'user-1')

      expect(prisma.personalAccessToken.delete).not.toHaveBeenCalled()
    })
  })
})
