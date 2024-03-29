import prisma from '../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { getConnection, closeConnections } from '../../connect.js'
import { adminGroupPath } from '@cpn-console/shared'
import { getRandomUser } from '@cpn-console/test-utils'
import { setRequestor } from '../../utils/mocks.js'
import app from '../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)

describe('Zone routes', () => {
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
  describe('getZonesController', () => {
    it('Should retrieve all zones', async () => {
      const zones = []

      prisma.zone.findMany.mockResolvedValue(zones)

      const response = await app.inject()
        .get('/api/v1/zones')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual([])
    })
  })
})
