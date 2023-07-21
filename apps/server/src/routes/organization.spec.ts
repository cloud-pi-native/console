import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { getRandomOrganization } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections } from '../connect.js'
import organizationRouter from './organization.js'
import prisma from '../__mocks__/prisma.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))
vi.mock('../prisma')

const app = fastify({ logger: false })
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)

const mockSessionPlugin = (app, opt, next) => {
  app.addHook('onRequest', (req, res, next) => {
    req.session = { user: getRequestor() }
    next()
  })
  next()
}

const mockSession = (app) => {
  app.register(fp(mockSessionPlugin))
    .register(organizationRouter)
}

const requestor = {}

// const setRequestorId = (id) => {
//   requestor.id = id
// }

const getRequestor = () => {
  return requestor
}

describe.skip('Organizations routes', () => {

  beforeAll(async () => {
    mockSession(app)
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
    it('Should retrieve active organizations', async () => {
      const mockPublishedPost = getRandomOrganization()

      prisma.organization.findMany.mockResolvedValueOnce([{ ...mockPublishedPost, active: false }])

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.body).toStrictEqual(JSON.stringify([mockPublishedPost]))
      expect(response.statusCode).toEqual(200)
    })

    it('Should return an error if retrieve organizations failed', async () => {
      prisma.organization.findMany.mockImplementation(() => {
        throw new Error('Echec de la récupération des organisations')
      })

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.body).toBe('Echec de la récupération des organisations')
      expect(response.statusCode).toEqual(404)
    })
  })
})
