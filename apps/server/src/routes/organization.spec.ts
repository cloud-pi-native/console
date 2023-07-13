import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomOrganization } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { closeConnections } from '../connect.js'
import organizationRouter from './organization.js'
import { allOrganizations } from 'shared'
import prisma from '../prisma.js'

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
    .register(organizationRouter)
}

const requestor = {}
const setRequestorId = (id) => {
  requestor.id = id
}

const getRequestor = () => {
  return requestor
}

describe.skip('Organizations routes', () => {
  let Organization

  beforeAll(async () => {
    mockSession(app)
    // await getConnection()
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
      const randomDbSetup = createRandomDbSetup({})
      const organizations = allOrganizations.map(org => getRandomOrganization(org.name, org.label))
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')
      prisma.organization.findMany.mockResolvedValue(organizations)

      // 1. getOrganizations
      // Organization.$queueResult(organizations)
      setRequestorId(owner.id)

      const response = await app.inject()
        .get('/')
        .end()

      // expect(prisma.organization.findMany.mock.calls).toHaveLength(1)
      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(organizations)
    })

    it('Should return an error if retrieve organizations failed', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')
      prisma.organization.findMany.mockRejectedValue(new Error('Impossible de trouver l’organisation'))

      // 1. getOrganizations
      // Organization.$queueFailure()
      setRequestorId(owner.id)

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body).toEqual('Echec de la récupération des organisations')
    })
  })
})
