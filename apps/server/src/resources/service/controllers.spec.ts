import prisma from '../../__mocks__/prisma.js'
import { vi, describe, it, beforeAll, expect, afterEach, afterAll } from 'vitest'
import { getConnection, closeConnections } from '../../connect.js'
import { getRandomUser } from '@cpn-console/test-utils'
import { setRequestor } from '../../utils/mocks.js'
import app from '../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)

describe('Service route', () => {
  beforeAll(async () => {
    await getConnection()
    prisma.project.findMany.mockResolvedValue({})
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
      const requestor = getRandomUser()
      setRequestor(requestor)

      const response = await app.inject()
        .get('/api/v1/services')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.json()).toEqual([])
    })

    it('Should retrieve an OK services status even if not logged', async () => {
      setRequestor(null)

      const response = await app.inject()
        .get('/api/v1/services')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.json()).toEqual([])
    })
  })
})
