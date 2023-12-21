import prisma from '../../__mocks__/prisma.js'
import app, { setRequestor } from '../../__mocks__/app.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { getRandomUser, repeatFn } from '@dso-console/test-utils'
import { getConnection, closeConnections } from '../../connect.js'
import { adminGroupPath } from '@dso-console/shared'

describe('Admin Users routes', () => {
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
      const users = repeatFn(5, getRandomUser)

      prisma.user.findMany.mockResolvedValue(users)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/api/v1/admin/users')
        .end()
      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(users)
    })

    it('Should return an error if retrieve users failed', async () => {
      const error = { statusCode: 500, message: 'Erreur de récupération des utilisateurs' }

      prisma.user.findMany.mockRejectedValue(error)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/api/v1/admin/users')
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.json().message).toEqual(error.message)
    })
    it('Should return an error if requestor is not admin', async () => {
      const requestor = getRandomUser()
      setRequestor(requestor)

      const response = await app.inject()
        .get('/api/v1/admin/users')
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual('Vous n\'avez pas les droits administrateur')
    })
  })
})
