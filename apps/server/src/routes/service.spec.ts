import { vi, describe, it, beforeAll, expect, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections } from '../connect.js'
import userRouter from './service.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))

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
    .register(userRouter)
}

const requestor = {}
const setRequestorId = (id) => {
  requestor.id = id
}

const getRequestor = () => {
  return requestor
}

describe('Service route', () => {
  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    global.fetch = vi.fn(() => Promise.resolve({
      status: 200,
      statusText: 'OK',
    }))
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // GET
  describe('checkServicesHealthController', () => {
    it('Should retrieve an OK service status', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const requestor = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(requestor.id)

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.json()).toEqual([{
        name: 'argocd',
        status: 'success',
        message: 'OK',
        code: 200,
      },
      {
        name: 'gitlab',
        status: 'success',
        message: 'OK',
        code: 200,
      },
      {
        name: 'nexus',
        status: 'success',
        message: 'OK',
        code: 200,
      },
      {
        name: 'registry',
        status: 'success',
        message: 'OK',
        code: 200,
      },
      {
        name: 'sonarqube',
        status: 'success',
        message: 'OK',
        code: 200,
      },
      {
        name: 'vault',
        status: 'success',
        message: 'OK',
        code: 200,
      }])
    })
  })
})
