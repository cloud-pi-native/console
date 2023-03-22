import { vi, describe, it, beforeAll, expect, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections, sequelize } from '../connect.js'
import userRouter from './service.js'
import { getUserModel } from '../models/user.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))
vi.mock('../ansible.js')

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
  let User

  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    User = getUserModel()
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
    sequelize.$clearQueue()
  })

  // GET
  describe('checkServicesHealthController', () => {
    it('Should retreive an OK service status', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const requestor = randomDbSetup.project.users.find(user => user.role === 'owner')

      User.$queueResult(requestor)
      setRequestorId(requestor.id)

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.json()).toEqual([{
        id: 'argocd',
        status: 'success',
        message: 'OK',
        code: 200,
      },
      {
        id: 'gitlab',
        status: 'success',
        message: 'OK',
        code: 200,
      },
      {
        id: 'nexus',
        status: 'success',
        message: 'OK',
        code: 200,
      },
      {
        id: 'quay',
        status: 'success',
        message: 'OK',
        code: 200,
      },
      {
        id: 'sonarqube',
        status: 'success',
        message: 'OK',
        code: 200,
      },
      {
        id: 'vault',
        status: 'success',
        message: 'OK',
        code: 200,
      }])
    })
  })
})
