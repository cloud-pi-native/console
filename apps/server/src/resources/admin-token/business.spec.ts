import { describe, expect, it } from 'vitest'
import type { AdminToken } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import prisma from '../../__mocks__/prisma.js'
import { createToken, deleteToken, listTokens } from './business.ts'

describe('test admin-token business', () => {
  describe('listTokens', () => {
    it('should stringify bigint', async () => {
      const partialtoken: Partial<AdminToken> = {
        permissions: 4n,
      }

      prisma.adminToken.findMany.mockResolvedValueOnce([partialtoken])
      const response = await listTokens({})
      expect(response).toEqual([{ permissions: '4' }])
    })
  })

  describe('createToken', () => {
    it('should create ', async () => {
      const dbToken: Partial<AdminToken> = undefined
      const userId = faker.string.uuid()
      const createdToken: AdminToken = {
        expirationDate: null,
        id: faker.string.uuid(),
        name: 'test',
        permissions: '2',
      }
      prisma.adminToken.findUnique.mockResolvedValueOnce(dbToken)
      prisma.adminToken.create.mockResolvedValueOnce(createdToken)
      await createToken({ name: 'test', permissions: '2', expirationDate: null }, userId, undefined)

      expect(prisma.adminToken.create).toHaveBeenCalledWith({
        data: {
          name: 'test',
          hash: expect.any(String),
          permissions: 2n,
          userId,
          expirationDate: null,
        },
        omit: expect.any(Object),
      })
    })
  })

  describe('deleteToken', () => {
    it('should delete token', async () => {
      prisma.adminToken.delete.mockResolvedValueOnce(undefined)
      await deleteToken(faker.string.uuid())
      expect(prisma.adminToken.updateMany).toHaveBeenCalledTimes(1)
    })
  })
})
