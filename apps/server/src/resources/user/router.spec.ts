import { beforeEach, describe, expect, it, vi } from 'vitest'
import { userContract, ADMIN_PERMS } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import app from '../../app.js'
import * as utilsController from '../../utils/controller.js'
import { getUserMockInfos, setRequestor } from '../../utils/mocks.js'
import * as business from './business.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessGetMatchingMock = vi.spyOn(business, 'getMatchingUsers')
const businessLogViaSessionMock = vi.spyOn(business, 'logViaSession')
const businessGetUsersMock = vi.spyOn(business, 'getUsers')
const businessPatchMock = vi.spyOn(business, 'patchUsers')

describe('test userContract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('getMatchingUsers', () => {
    it('should return matching users', async () => {
      const usersMatching: any[] = []
      businessGetMatchingMock.mockResolvedValueOnce(usersMatching)

      const response = await app.inject()
        .get(userContract.getMatchingUsers.path)
        .query({ letters: faker.person.fullName() })
        .end()

      expect(businessGetMatchingMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(usersMatching)
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('auth', () => {
    it('should return logged user', async () => {
      const user = {
        id: faker.string.uuid(),
        adminRoleIds: [],
        createdAt: (new Date()).toISOString(),
        updatedAt: (new Date()).toISOString(),
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        type: 'human' as const,
        lastName: faker.person.lastName(),
        lastLogin: (new Date()).toISOString(),
      }
      // @ts-ignore
      setRequestor(user)
      // @ts-ignore
      businessLogViaSessionMock.mockResolvedValueOnce({ user, adminPerms: 0n })

      const response = await app.inject()
        .get(userContract.auth.path)
        .end()

      expect(businessLogViaSessionMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(user)
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('getAllUsers', () => {
    it('should return all users for admin', async () => {
      const user = getUserMockInfos(ADMIN_PERMS.MANAGE_USERS)
      const users: any[] = []
      authUserMock.mockResolvedValueOnce(user)
      businessGetUsersMock.mockResolvedValueOnce(users)

      const response = await app.inject()
        .get(userContract.getAllUsers.path)
        .query({ role: 'admin' })
        .end()

      expect(authUserMock).toHaveBeenCalledTimes(1)
      expect(businessGetUsersMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(users)
      expect(response.statusCode).toEqual(200)
    })
    it('should return 403 for non-admin', async () => {
      const user = getUserMockInfos(ADMIN_PERMS.MANAGE_ROLES)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(userContract.getAllUsers.path)
        .query({ role: 'admin' })
        .end()

      expect(authUserMock).toHaveBeenCalledTimes(1)
      expect(businessGetUsersMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })

  describe('patchUsers', () => {
    const usersPatchData = [{
      id: faker.string.uuid(),
      adminRoleIds: [],
    }]
    const usersReturn = [{
      id: faker.string.uuid(),
      adminRoleIds: [],
      createdAt: (new Date()).toISOString(),
      updatedAt: (new Date()).toISOString(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      type: 'human',
    }]

    it('should patch and return users for admin', async () => {
      const user = getUserMockInfos(ADMIN_PERMS.MANAGE_USERS)
      authUserMock.mockResolvedValueOnce(user)

      businessPatchMock.mockResolvedValueOnce(usersReturn)
      const response = await app.inject()
        .patch(userContract.patchUsers.path)
        .body(usersPatchData)
        .end()

      expect(authUserMock).toHaveBeenCalledTimes(1)
      expect(businessPatchMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(usersReturn)
      expect(response.statusCode).toEqual(200)
    })
    it('should return 403 for non-admin', async () => {
      const user = getUserMockInfos(ADMIN_PERMS.MANAGE_ROLES)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .patch(userContract.patchUsers.path)
        .body(usersPatchData)
        .end()

      expect(authUserMock).toHaveBeenCalledTimes(1)
      expect(businessPatchMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })
})
