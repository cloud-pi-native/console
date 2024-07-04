import prisma from '../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { getRandomOrganization, getRandomUser } from '@cpn-console/test-utils'
import { getConnection, closeConnections } from '../../connect.js'
import { setRequestor } from '../../utils/mocks.js'
import app from '../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)

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
      const organizations = [getRandomOrganization()]

      prisma.organization.findMany.mockResolvedValueOnce(organizations)

      const response = await app.inject()
        .get('/api/v1/organizations')
        .end()
      expect(response.json()).toStrictEqual(organizations)
      expect(response.statusCode).toEqual(200)
    })
  })
})
