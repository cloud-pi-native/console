import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { getRandomOrganization, getRandomUser, User } from 'test-utils'
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

let requestor: User

const setRequestor = (user: User) => {
  requestor = user
}

const getRequestor = () => {
  return requestor
}

describe('Organizations routes', () => {

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
    const requestor = getRandomUser()
    setRequestor(requestor)
    
    it('Should retrieve active organizations', async () => {
      const mockPublishedGet = getRandomOrganization()

      prisma.user.upsert.mockResolvedValueOnce(requestor)
      prisma.organization.findMany.mockResolvedValueOnce([mockPublishedGet])

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.body).toStrictEqual(JSON.stringify([mockPublishedGet]))
      expect(response.statusCode).toEqual(200)
    })

    it('Should return an error if requestor cannot be found', async () => {
      prisma.user.upsert.mockResolvedValueOnce(undefined)

      const response = await app.inject()
        .get('/')
        .end()

      expect(JSON.parse(response.body).message).toBe('Veuillez vous connecter')
      expect(response.statusCode).toEqual(401)
    })
    
    it('Should return an error if retrieve organizations failed', async () => {
      prisma.user.upsert.mockResolvedValueOnce(requestor)
      prisma.organization.findMany.mockImplementation(() => {
        throw new Error('Echec de la récupération des organisations')
      })

      const response = await app.inject()
        .get('/')
        .end()

      expect(JSON.parse(response.body).message).toBe('Echec de la récupération des organisations')
      expect(response.statusCode).toEqual(500)
    })
  })
})
