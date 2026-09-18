import type { Prisma } from '@prisma/client'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import {
  createUserToken,
  listUserTokens,
  userTokenSelect,
} from './user-tokens-queries.utils'

describe('user-tokens-queries.utils', () => {
  let tx: DeepMockProxy<Prisma.TransactionClient>

  beforeEach(() => {
    tx = mockDeep<Prisma.TransactionClient>()
  })

  describe('listUserTokens', () => {
    it('scopes by userId and uses the shared select', async () => {
      const userId = faker.string.uuid()
      tx.personalAccessToken.findMany.mockResolvedValue([])

      await listUserTokens(tx, userId)

      expect(tx.personalAccessToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId }, select: userTokenSelect }),
      )
    })
  })

  describe('createUserToken', () => {
    it('creates a personal access token with the provided fields', async () => {
      const data = {
        name: faker.word.noun(),
        expirationDate: faker.date.future(),
        hash: faker.string.alphanumeric(64),
        userId: faker.string.uuid(),
      }

      await createUserToken(tx, data)

      expect(tx.personalAccessToken.create).toHaveBeenCalledWith({ data, select: userTokenSelect })
    })
  })
})
