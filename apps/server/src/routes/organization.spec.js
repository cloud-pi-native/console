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
import { allOrganizations } from 'shared/src/utils/iterables.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))
vi.mock('../ansible.js')

const app = fastify({ logger: false })
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)

const mockSessionPlugin = (app, opt, next) => {
  app.addHook('onRequest', (req, res, next) => {
    req.session = { user: getOwner() }
    next()
  })
  next()
}

const mockSession = (app) => {
  app.register(fp(mockSessionPlugin))
    .register(organizationRouter)
}

const owner = {}
const setOwnerId = (id) => {
  owner.id = id
}

const getOwner = () => {
  return owner
}

describe('Project routes', () => {
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
    global.fetch = vi.fn(() => Promise.resolve())
  })

  // GET
  describe('getOrganizationsController', () => {
    it('Should retrieve organizations', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const organizations = allOrganizations.map(org => getRandomOrganization(org.name, org.label))
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // 1. getOrganizations
      Organization.$queueResult(organizations)
      setOwnerId(owner.id)

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(organizations)
    })
  })
})
