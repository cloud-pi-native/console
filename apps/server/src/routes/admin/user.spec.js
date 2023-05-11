import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { getRandomUser, repeatFn } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../../utils/keycloak.js'
import { getConnection, closeConnections, sequelize } from '../../connect.js'
import adminUsersRouter from './user.js'
import { getUserModel } from '../../models/user.js'
import { adminGroupPath } from 'shared/src/utils/const.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))

const app = fastify({ logger: false })
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)

const mockSessionPlugin = (app, opt, next) => {
  app.addHook('onRequest', (req, res, next) => {
    if (req.headers.admin) {
      req.session = { user: { groups: [adminGroupPath] } }
    } else {
      req.session = { user: { } }
    }
    next()
  })
  next()
}

const mockSession = (app) => {
  app.register(fp(mockSessionPlugin))
    .register(adminUsersRouter)
}

describe('Admin Users routes', () => {
  let User
  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    User = getUserModel()
    global.fetch = vi.fn(() => Promise.resolve())
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
    sequelize.$clearQueue()
    global.fetch = vi.fn(() => Promise.resolve({ json: async () => { } }))
  })

  // GET
  describe('getUsersController', () => {
    it('Should retrieve users', async () => {
      // Create users
      const users = repeatFn(5)(getRandomUser)

      User.$queueResult(users)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/')
        .end()
      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(users)
    })

    it('Should return an error if retrieve users failed', async () => {
      User.$queueFailure(new Error('Erreur inexpliquable'))

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/')
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body).toEqual('Erreur inexpliquable')
    })
    it('Should not retrieve users because not admin', async () => {
      // Create users
      const users = repeatFn(5)(getRandomUser)

      User.$queueResult(users)

      const response = await app.inject()
        .get('/')
        .end()
      expect(response.statusCode).toEqual(404)
      expect(response.body).toEqual('Vous n\'avez pas les droits administrateurs')
    })
  })
})
