import prisma from '../../__mocks__/prisma.js'
import { vi, describe, it, beforeAll, expect, afterEach, afterAll } from 'vitest'
import { getConnection, closeConnections } from '../../connect.js'
import { getRandomUser } from '@cpn-console/test-utils'
import { getRequestor, setRequestor } from '../../utils/mocks.js'
import app from '../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)

describe('Service route', () => {
  const requestor = getRandomUser()
  setRequestor(requestor)

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
  describe('checkServicesHealthController', () => {
    it('Should retrieve an OK services status', async () => {
      prisma.user.upsert.mockResolvedValue(getRequestor())

      const response = await app.inject()
        .get('/api/v1/services')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.json()).toEqual([])
    })

    it('Should not retrieve services status if not logged', async () => {
      const response = await app.inject()
        .get('/api/v1/services')
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).error).toEqual('Vous n\'avez pas accès à cette information')
    })
  })
})
