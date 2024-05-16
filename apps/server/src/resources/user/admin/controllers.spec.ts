import prisma from '../../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { getRandomUser, repeatFn } from '@cpn-console/test-utils'
import { adminGroupPath, userAdminContract } from '@cpn-console/shared'
import { getConnection, closeConnections } from '../../../connect.js'
import { setRequestor } from '../../../utils/mocks.js'
import app from '../../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../../utils/mocks.js')).mockSessionPlugin)
vi.mock('../../utils/hook-wrapper.js', (await import('../../../utils/mocks.js')).mockHookWrapper)

describe('Admin user routes', () => {
  beforeAll(async () => {
    await getConnection()
  })

  afterAll(async () => {
    return closeConnections()
  })

  beforeEach(() => {
    const requestor = { ...getRandomUser(), groups: [adminGroupPath] }
    setRequestor(requestor)

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // GET
  describe('getUsersController', () => {
    it('Should retrieve users', async () => {
      // Create users
      const users = repeatFn(5)(getRandomUser)

      prisma.user.findMany.mockResolvedValue(users)
      prisma.adminPlugin.findMany.mockResolvedValue([])

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get(userAdminContract.getAllUsers.path)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(users.map(user => ({ ...user, isAdmin: false })))
    })

    it('Should return an error if retrieve users failed', async () => {
      const error = { statusCode: 500, message: 'Erreur de récupération des utilisateurs' }

      prisma.user.findMany.mockRejectedValue(error)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get(userAdminContract.getAllUsers.path)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(JSON.parse(response.body).error).toEqual(error.message)
    })

    it('Should return an error if requestor is not admin', async () => {
      const requestor = getRandomUser()
      setRequestor(requestor)

      const response = await app.inject()
        .get(userAdminContract.getAllUsers.path)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual('Vous n\'avez pas les droits administrateur')
    })
  })

  // PUT
  describe('updateUserAdminRole', () => {
    it('Should make an non-admin user admin', async () => {
      const user = getRandomUser()

      prisma.adminPlugin.findMany.mockResolvedValue([])

      const response = await app.inject({ headers: { admin: 'admin' } })
        .put(`/api/v1/admin/users/${user.id}`)
        .body({ isAdmin: false })
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should make an admin user non-admin', async () => {
      const user = getRandomUser()

      prisma.adminPlugin.findMany.mockResolvedValue([])

      const response = await app.inject({ headers: { admin: 'admin' } })
        .put(`/api/v1/admin/users/${user.id}`)
        .body({ isAdmin: true })
        .end()

      expect(response.statusCode).toEqual(204)
    })
  })
})
