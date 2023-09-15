import { vi, describe, it, beforeAll, expect, afterEach, afterAll } from 'vitest'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections } from '../connect.js'
import serviceRouter from './service.js'
import prisma from '../__mocks__/prisma.js'
import { User, getRandomUser } from '@dso-console/test-utils'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))
vi.mock('../prisma.js')

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
    .register(serviceRouter)
}

let requestor: User

const setRequestor = (user: User) => {
  requestor = user
}

const getRequestor = () => {
  return requestor
}

describe('Service route', () => {
  const requestor = getRandomUser()
  setRequestor(requestor)

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
  describe('checkServicesHealthController', () => {
    it('Should retrieve an OK services status', async () => {
      prisma.user.findUnique.mockResolvedValue(requestor)

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.json()).toEqual([])
    })

    it('Should not retrieve services status if not logged', async () => {
      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual('Vous n\'avez pas accès à cette information')
    })
  })
})
