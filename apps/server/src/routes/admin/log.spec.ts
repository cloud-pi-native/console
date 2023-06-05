import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../../utils/keycloak.js'
import { getConnection, closeConnections } from '../../connect.js'
import logRouter from './log.js'
import { adminGroupPath } from 'shared'
import { getRandomLog, repeatFn } from 'test-utils'
import { checkAdminGroup } from '../../utils/controller.js'
import { sequelize } from '../../../vitest-init'
import { getLogModel } from '../../models/log.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))

const app = fastify({ logger: false })
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)

const mockSessionPlugin = (app, opt, next) => {
  app.addHook('onRequest', (req, res, next) => {
    if (req.headers.admin) {
      req.session = { user: { groups: [adminGroupPath] } }
    } else {
      req.session = { user: {} }
    }
    next()
  })
  next()
}

const mockSession = (app) => {
  app.addHook('preHandler', checkAdminGroup)
    .register(fp(mockSessionPlugin))
    .register(logRouter)
}

describe('Admin logs routes', () => {
  let Log

  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    Log = getLogModel()
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
    sequelize.$clearQueue()
    Log.$clearQueue()
  })

  // GET
  describe('getAllLogsController', () => {
    it('Should retrieve all logs', async () => {
      const logs = repeatFn(5)(getRandomLog)

      Log.$queueResult(logs)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/0/100')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(JSON.stringify(response.json())).toMatchObject(JSON.stringify(logs))
    })

    it('Should return an error if retrieve logs failed', async () => {
      Log.$queueFailure()

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/0/100')
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body).toEqual('Echec de la récupération des logs')
    })

    it('Should return an error if requestor is not admin', async () => {
      const response = await app.inject()
        .get('/0/100')
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Vous n\'avez pas les droits administrateur')
    })
  })
  
  describe('countAllLogsController', () => {
    it.skip('Should count all logs', async () => {
      // TODO : _vite_ssr_import_1__.getLogModel(...).count is not a function

      const logs = (repeatFn(5)(getRandomLog)).map(log => Log.build(log))
      const logsCount = 5

      Log.$queueResult(logs)
      sequelize.$queueResult(logsCount)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/count')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(JSON.stringify(response.json())).toMatchObject(JSON.stringify(logsCount))
    })

    it.skip('Should return an error if retrieve logs failed', async () => {
      // TODO : _vite_ssr_import_1__.getLogModel(...).count is not a function
      Log.$queueFailure()

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/count')
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body).toEqual('Echec du comptage des logs')
    })

    it('Should return an error if requestor is not admin', async () => {
      const response = await app.inject()
        .get('/0/100')
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Vous n\'avez pas les droits administrateur')
    })
  })
})
