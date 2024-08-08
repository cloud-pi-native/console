import { describe, expect, it, vi, beforeEach } from 'vitest'
import { userContract } from '@cpn-console/shared'
import app from '../../app.js'
import * as business from './business.js'
import * as utilsController from '../../utils/controller.js'
import { faker } from '@faker-js/faker'
import { getUserMockInfos } from '../../utils/mocks.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessGetMatchingMock = vi.spyOn(business, 'getMatchingUsers')
const businessLogMock = vi.spyOn(business, 'logUser')
const businessGetUsersMock = vi.spyOn(business, 'getUsers')
const businessPatchMock = vi.spyOn(business, 'patchUsers')

describe('Test userContract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('getMatchingUsers', () => {
    it('Should return matching users', async () => {
      const usersMatching = []
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
    it('Should return logged user', async () => {
      const user = {
        id: faker.string.uuid(),
        adminRoleIds: [],
        createdAt: (new Date()).toISOString(),
        updatedAt: (new Date()).toISOString(),
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
      }
      businessLogMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(userContract.auth.path)
        .end()

      expect(businessLogMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(user)
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('getAllUsers', () => {
    it('Should return all users for admin', async () => {
      const user = getUserMockInfos(true)
      const users = []
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
    it('Should return 403 for non-admin', async () => {
      const user = getUserMockInfos(false)
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
    }]

    it('Should patch and return users for admin', async () => {
      const user = getUserMockInfos(true)
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
    it('Should return 403 for non-admin', async () => {
      const user = getUserMockInfos(false)
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