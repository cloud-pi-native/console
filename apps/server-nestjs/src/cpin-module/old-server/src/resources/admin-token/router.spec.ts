import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExposedAdminToken } from '@cpn-console/shared'
import { adminTokenContract } from '@cpn-console/shared'
import type { AdminToken } from '@prisma/client'
import app from '../../app'
import * as utilsController from '../../utils/controller'
import { getUserMockInfos } from '../../utils/mocks'
import { BadRequest400 } from '../../utils/errors'
import * as business from './business'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks')).mockSessionPlugin)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessListTokensMock = vi.spyOn(business, 'listTokens')
const businessCreateTokenMock = vi.spyOn(business, 'createToken')
const businessDeleteTokenMock = vi.spyOn(business, 'deleteToken')

describe('test adminTokenContract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('listAdminTokens', () => {
    it('should return list of admin tokens', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      const tokens: AdminToken[] = [{
        id: faker.string.uuid(),
        name: 'token1',
        permissions: '2',
        lastUse: (new Date()).toISOString(),
        expirationDate: null,
        status: 'active',
        createdAt: (new Date(Date.now())).toISOString(),
      }]
      businessListTokensMock.mockResolvedValueOnce(tokens)

      const response = await app.inject()
        .get(adminTokenContract.listAdminTokens.path)
        .end()

      expect(businessListTokensMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(tokens)
      expect(response.statusCode).toEqual(200)
    })

    it('should return 403 for non-admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(adminTokenContract.listAdminTokens.path)
        .end()

      expect(businessListTokensMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })

  describe('createAdminToken', () => {
    it('should create a token for authorized users', async () => {
      const user = getUserMockInfos(true)

      const newToken = {
        id: faker.string.uuid(),
        name: 'test',
        lastUse: null,
        expirationDate: null,
        password: faker.string.alpha({ casing: 'lower', length: 10 }),
        permissions: '2',
        createdAt: (new Date(Date.now())).toISOString(),
        status: 'active',
      }
      const tokenData: ExposedAdminToken = {
        name: newToken.name,
        permissions: newToken.permissions,
        expirationDate: null,
      }

      authUserMock.mockResolvedValueOnce(user)
      businessCreateTokenMock.mockResolvedValueOnce(newToken)

      const response = await app.inject()
        .post(adminTokenContract.createAdminToken.path)
        .body(tokenData)
        .end()

      expect(businessCreateTokenMock).toHaveBeenCalledWith(tokenData)
      expect(response.json()).toEqual(newToken)
      expect(response.statusCode).toEqual(201)
    })

    it('should return 403 for unauthorized users', async () => {
      const user = getUserMockInfos(false)

      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(adminTokenContract.createAdminToken.path)
        .body({
          name: 'new-token',
          expirationDate: null,
          permissions: '4',
        })
        .end()

      expect(businessCreateTokenMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })

    it('should pass business error', async () => {
      const user = getUserMockInfos(true)

      authUserMock.mockResolvedValueOnce(user)
      businessCreateTokenMock.mockResolvedValueOnce(new BadRequest400('Invalid date'))

      const response = await app.inject()
        .post(adminTokenContract.createAdminToken.path)
        .body({
          name: 'new-token',
          expirationDate: null,
          permissions: '4',
        })
        .end()

      expect(businessCreateTokenMock).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(400)
    })
  })

  describe('deleteAdminToken', () => {
    const tokenId = faker.string.uuid()
    it('should delete a token for authorized users', async () => {
      const user = getUserMockInfos(true)

      authUserMock.mockResolvedValueOnce(user)
      businessDeleteTokenMock.mockResolvedValueOnce(null)

      const response = await app.inject()
        .delete(adminTokenContract.deleteAdminToken.path.replace(':tokenId', tokenId))
        .end()

      expect(businessDeleteTokenMock).toHaveBeenCalledWith(tokenId)
      expect(response.statusCode).toEqual(204)
    })

    it('should return 403 for unauthorized users', async () => {
      const user = getUserMockInfos(false)

      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(adminTokenContract.deleteAdminToken.path.replace(':tokenId', tokenId))
        .end()

      expect(businessDeleteTokenMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })
})
