import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomOrganization } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections, sequelize } from '../connect.js'
import organizationRouter from './organization.js'
import { getOrganizationModel } from '../models/organization.js'
import { allOrganizations } from 'shared/src/utils/const.js'

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
    .register(organizationRouter)
}

const requestor = {}
const setRequestorId = (id) => {
  requestor.id = id
}

const getRequestor = () => {
  return requestor
}

describe('Organizations routes', () => {
  let Organization

  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    Organization = getOrganizationModel()
    global.fetch = vi.fn(() => Promise.resolve())
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
    sequelize.$clearQueue()
    global.fetch = vi.fn(() => Promise.resolve({ json: async () => {} }))
  })

  // GET
  describe('getActiveOrganizationsController', () => {
    it('Should retrieve active organizations', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const organizations = allOrganizations.map(org => getRandomOrganization(org.name, org.label))
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // 1. getOrganizations
      Organization.$queueResult(organizations)
      setRequestorId(owner.id)

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(organizations)
    })

    it('Should return an error if retrieve organizations failed', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // 1. getOrganizations
      Organization.$queueFailure()
      setRequestorId(owner.id)

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body).toEqual('Echec de la récupération des organisations')
    })
  })
})
