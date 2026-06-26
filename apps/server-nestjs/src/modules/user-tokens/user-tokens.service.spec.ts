import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { userTokenSelect } from './user-tokens-queries.utils'
import { UserTokensService } from './user-tokens.service'
import { CreatePersonalAccessTokenBodySchema } from './user-tokens.utils'

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
        expirationDate: faker.date.future(),
        status: 'active' as const,
        createdAt: faker.date.past(),
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
    it('rejects a non-parseable expirationDate via the body schema', () => {
      const result = CreatePersonalAccessTokenBodySchema.safeParse({ name: 'x', expirationDate: 'not-a-date' })
      expect(result.success).toBe(false)
    })

    it('rejects an expirationDate that is too soon via the body schema', () => {
      const today = faker.date.recent()
      const result = CreatePersonalAccessTokenBodySchema.safeParse({ name: 'x', expirationDate: today.toISOString() })
      expect(result.success).toBe(false)
    })

    it('returns created token with plaintext password', async () => {
      const userId = faker.string.uuid()
      const tokenId = faker.string.uuid()
      prisma.personalAccessToken.create.mockResolvedValue({
        id: tokenId,
        name: 'my-token',
        lastUse: null,
        expirationDate: faker.date.future(),
        status: 'active' as const,
        createdAt: faker.date.past(),
        userId,
        hash: 'hash-2',
      })

      const result = await service.create({ name: 'my-token', expirationDate: faker.date.future() }, userId)

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
      prisma.personalAccessToken.deleteMany.mockResolvedValue({ count: 0 })

      await service.delete('unknown', 'user-1')

      expect(prisma.personalAccessToken.deleteMany).toHaveBeenCalledWith({
        where: { id: 'unknown', userId: 'user-1' },
      })
    })
  })
})
