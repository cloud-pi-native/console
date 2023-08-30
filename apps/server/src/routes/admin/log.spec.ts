import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '@/utils/keycloak.js'
import { getConnection, closeConnections } from '@/connect.js'
import logRouter from './log.js'
import { adminGroupPath } from 'shared'
import { getRandomLog, getRandomUser, repeatFn } from 'test-utils'
import { checkAdminGroup } from '@/utils/controller.js'
import prisma from '../../__mocks__/prisma.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))
vi.mock('../../prisma.js')

const app = fastify({ logger: false })
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)

const mockSessionPlugin = (app, opt, next) => {
  app.addHook('onRequest', (req, res, next) => {
    if (req.headers.admin) {
      req.session = {
        user: {
          ...getRequestor(),
          groups: [adminGroupPath]
        }
      }
    } else {
      req.session = { user: getRequestor() }
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

let requestor: User

const setRequestor = (user: User) => {
  requestor = user
}

const getRequestor = () => {
  return requestor
}

describe('Admin logs routes', () => {
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
  describe('getAllLogsController', () => {
    it('Should retrieve all logs', async () => {
      const logs = repeatFn(5)(getRandomLog)

      prisma.$transaction.mockResolvedValue([logs.length, logs])

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('?offset=0&limit=100')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toMatchObject({total: logs.length, logs})
    })

    it('Should return an error if retrieve logs failed', async () => {
      prisma.$transaction.mockRejectedValue({statusCode: 500, message: 'Erreur de récupération des logs'})
      
      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('?offset=0&limit=100')
        .end()
      
      expect(response.statusCode).toEqual(500)
      expect(JSON.parse(response.body).message).toEqual('Erreur de récupération des logs')
    })

    it('Should return an error if requestor is not admin', async () => {
      const response = await app.inject()
        .get('?offset=0&limit=100')
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Vous n\'avez pas les droits administrateur')
    })
  })
})
