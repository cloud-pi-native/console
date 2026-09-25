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
        name: faker.word.noun(),
        lastUse: null,
        expirationDate: faker.date.future({ refDate: new Date(Date.now() + 86_400_000) }),
        status: 'active' as const,
        createdAt: faker.date.past(),
        userId,
        hash: faker.string.alphanumeric(64),
      }])

      const result = await service.list(userId)

      expect(prisma.personalAccessToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        }),
      )
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(tokenId)
    })

    it('selects only exposed token fields', async () => {
      const userId = faker.string.uuid()
      prisma.personalAccessToken.findMany.mockResolvedValue([])

      await service.list(userId)

      expect(prisma.personalAccessToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ select: userTokenSelect }),
      )
    })
  })

  describe('create', () => {
    it('returns created token with plaintext password', async () => {
      const userId = faker.string.uuid()
      const tokenId = faker.string.uuid()
      const tokenName = faker.word.noun()
      prisma.personalAccessToken.create.mockResolvedValue({
        id: tokenId,
        name: tokenName,
        lastUse: null,
        expirationDate: faker.date.future({ refDate: new Date(Date.now() + 86_400_000) }),
        status: 'active' as const,
        createdAt: faker.date.past(),
        userId,
        hash: faker.string.alphanumeric(64),
      })

      const result = await service.create({ name: tokenName, expirationDate: faker.date.future({ refDate: new Date(Date.now() + 86_400_000) }) }, userId)

      expect(prisma.personalAccessToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            name: tokenName,
          }),
          select: userTokenSelect,
        }),
      )
      expect(result.id).toBe(tokenId)
      expect(result.password).toBeTruthy()
    })
  })

  describe('delete', () => {
    it('deletes token scoped to its owner in a single atomic call', async () => {
      const tokenId = faker.string.uuid()
      const userId = faker.string.uuid()
      prisma.personalAccessToken.deleteMany.mockResolvedValue({ count: 1 })

      await service.delete(tokenId, userId)

      expect(prisma.personalAccessToken.deleteMany).toHaveBeenCalledWith({
        where: { id: tokenId, userId },
      })
    })

    it('no-ops (count 0) when token is missing or belongs to another user', async () => {
      const tokenId = faker.string.uuid()
      const userId = faker.string.uuid()
      prisma.personalAccessToken.deleteMany.mockResolvedValue({ count: 0 })

      await service.delete(tokenId, userId)

      expect(prisma.personalAccessToken.deleteMany).toHaveBeenCalledWith({
        where: { id: tokenId, userId },
      })
    })
  })
})
