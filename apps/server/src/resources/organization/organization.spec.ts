import prisma from '../../__mocks__/prisma.js'
import app, { getRequestor, setRequestor } from '../../__mocks__/app.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { getRandomOrganization, getRandomUser } from '@cpn-console/test-utils'
import { getConnection, closeConnections } from '../../connect.js'

describe('Organization routes', () => {
  beforeAll(async () => {
    await getConnection()
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // GET
  describe('getActiveOrganizationsController', () => {
    const requestor = getRandomUser()
    setRequestor(requestor)

    it('Should retrieve active organizations', async () => {
      const mockPublishedGet = getRandomOrganization()

      prisma.user.upsert.mockResolvedValueOnce(getRequestor())
      prisma.organization.findMany.mockResolvedValueOnce([mockPublishedGet])

      const response = await app.inject()
        .get('/api/v1/organizations')
        .end()
      expect(response.json()).toStrictEqual([mockPublishedGet])
      expect(response.statusCode).toEqual(200)
    })

    it('Should return an error if requestor cannot be found', async () => {
      prisma.user.upsert.mockResolvedValueOnce(undefined)

      const response = await app.inject()
        .get('/api/v1/organizations')
        .end()

      expect(response.json().message).toBe('Veuillez vous connecter')
      expect(response.statusCode).toEqual(401)
    })

    it('Should return an error if retrieve organizations failed', async () => {
      prisma.user.upsert.mockResolvedValueOnce(getRequestor())
      prisma.organization.findMany.mockImplementation(() => {
        throw new Error('Echec de la récupération des organisations')
      })

      const response = await app.inject()
        .get('/api/v1/organizations')
        .end()

      expect(response.json().message).toBe('Echec de la récupération des organisations')
      expect(response.statusCode).toEqual(500)
    })
  })
})
