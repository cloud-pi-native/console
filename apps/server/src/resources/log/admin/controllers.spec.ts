import prisma from '../../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { getConnection, closeConnections } from '../../../connect.js'
import { adminGroupPath } from '@cpn-console/shared'
import { getRandomLog, getRandomUser, repeatFn } from '@cpn-console/test-utils'
import { setRequestor } from '../../../utils/mocks.js'
import app from '../../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../../utils/mocks.js')).mockSessionPlugin)

describe('Admin log routes', () => {
  const requestor = { ...getRandomUser(), groups: [adminGroupPath] }
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
  describe('getAllLogsController', () => {
    it('Should retrieve all logs', async () => {
      const logs = repeatFn(5)(getRandomLog)

      prisma.$transaction.mockResolvedValue([logs.length, logs])

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/api/v1/admin/logs?offset=0&limit=100')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toMatchObject({ total: logs.length, logs })
    })

    it('Should return an error if retrieve logs failed', async () => {
      prisma.$transaction.mockRejectedValue({ statusCode: 500, message: 'Erreur de récupération des logs' })

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/api/v1/admin/logs?offset=0&limit=100')
        .end()

      expect(response.statusCode).toEqual(500)
      expect(JSON.parse(response.body).error).toEqual('Erreur de récupération des logs')
    })

    it('Should return an error if requestor is not admin', async () => {
      const requestor = { ...getRandomUser() }
      setRequestor(requestor)
      const response = await app.inject()
        .get('/api/v1/admin/logs?offset=0&limit=100')
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual('Vous n\'avez pas les droits administrateur')
    })
  })
})
