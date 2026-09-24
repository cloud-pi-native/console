import type { Prisma } from '@prisma/client'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import {
  adminTokenSelect,
  createAdminToken,
  createBotUser,
  listAdminTokens,
  revokeAdminToken,
} from './admin-token-queries.utils'

describe('admin-token-queries.utils', () => {
  let tx: DeepMockProxy<Prisma.TransactionClient>

  beforeEach(() => {
    tx = mockDeep<Prisma.TransactionClient>()
  })

  describe('listAdminTokens', () => {
    it('filters to active tokens by default', async () => {
      tx.adminToken.findMany.mockResolvedValue([])

      await listAdminTokens(tx, false)

      expect(tx.adminToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'active' }, select: adminTokenSelect }),
      )
    })

    it('includes revoked tokens when withRevoked is true', async () => {
      tx.adminToken.findMany.mockResolvedValue([])

      await listAdminTokens(tx, true)

      expect(tx.adminToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: { in: ['active', 'revoked'] } }, select: adminTokenSelect }),
      )
    })
  })

  describe('createBotUser', () => {
    it('creates a bot user with a derived email', async () => {
      const botUserId = faker.string.uuid()
      const name = faker.person.fullName()

      await createBotUser(tx, { botUserId, name })

      expect(tx.user.create).toHaveBeenCalledWith({
        data: {
          firstName: 'Bot Admin',
          lastName: name,
          type: 'bot',
          id: botUserId,
          email: `${botUserId}@bot.io`,
        },
      })
    })
  })

  describe('createAdminToken', () => {
    it('creates an admin token with the provided fields', async () => {
      const data = {
        name: faker.word.noun(),
        permissions: 4n,
        expirationDate: null,
        hash: faker.string.alphanumeric(64),
        userId: faker.string.uuid(),
      }

      await createAdminToken(tx, data)

      expect(tx.adminToken.create).toHaveBeenCalledWith({ data, select: adminTokenSelect })
    })
  })

  describe('revokeAdminToken', () => {
    it('marks the token revoked with a fresh expiration date', async () => {
      const id = faker.string.uuid()

      await revokeAdminToken(tx, id)

      const call = tx.adminToken.updateMany.mock.calls[0]?.[0]
      expect(call?.where).toEqual({ id })
      expect(call?.data.status).toBe('revoked')
      expect(call?.data.expirationDate).toBeInstanceOf(Date)
    })
  })
})
