import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { getRandomOrganization } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../../utils/keycloak.js'
import { getConnection, closeConnections, sequelize } from '../../connect.js'
import organizationRouter from './organization.js'
import { getOrganizationModel } from '../../models/organization.js'
import { allOrganizations } from 'shared/src/utils/iterables.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))

const app = fastify({ logger: false })
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)

const mockSessionPlugin = (app, opt, next) => {
  app.addHook('onRequest', (req, res, next) => {
    if (req.headers.admin) {
      req.session = { user: { groups: ['admin'] } }
    } else {
      req.session = { user: { } }
    }
    next()
  })
  next()
}

const mockSession = (app) => {
  app.register(fp(mockSessionPlugin))
    .register(organizationRouter)
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
  describe('getAllOrganizationsController', () => {
    it('Should retrieve all organizations', async () => {
      const organizations = allOrganizations.map(org => getRandomOrganization(org.name, org.label))

      Organization.$queueResult(organizations)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(organizations)
    })

    it('Should return an error if retrieve organizations failed', async () => {
      Organization.$queueFailure()

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/')
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body).toEqual('Echec de récupération des organisations')
    })

    it('Should return an error if requestor is not admin', async () => {
      Organization.$queueFailure()

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Vous n\'avez pas les droits administrateurs')
    })
  })

  describe('createOrganizationController', () => {
    it('Should create an organization', async () => {
      const organization = {
        name: 'my-org',
        label: 'Ministère de la bicyclette',
      }

      Organization.$queueResult(null)
      Organization.$queueResult(organization)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .post('/')
        .body(organization)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toMatchObject(organization)
    })

    it('Should return an error if name is too long', async () => {
      const organization = {
        name: 'anticonstitutionnellement',
        label: 'Ministère de l\'anti-constitutionnalité',
      }

      const response = await app.inject({ headers: { admin: 'admin' } })
        .post('/')
        .body(organization)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toEqual('"name" length must be less than or equal to 10 characters long')
    })

    it('Should return an error if organization already exists', async () => {
      const organization = {
        name: 'my-org',
        label: 'Ministère de l\'italo-disco',
      }

      Organization.$queueResult(organization)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .post('/')
        .body(organization)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toEqual('Cette organisation existe déjà')
    })

    it('Should return an error if requestor is not admin', async () => {
      const organization = {
        name: 'my-org',
        label: 'Ministère de l\'italo-disco',
      }

      Organization.$queueResult(organization)

      const response = await app.inject()
        .post('/')
        .body(organization)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Vous n\'avez pas les droits administrateurs')
    })
  })

  describe('updateOrganizationController', () => {
    it('Should update an organization label and activeness', async () => {
      const organization = getRandomOrganization()
      const data = {
        active: false,
        label: 'Ministère du disco',
      }
      Organization.$queueResult(organization)
      Organization.$queueResult(organization)
      Organization.$queueResult(organization)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .put('/m-disc')
        .body(data)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toMatchObject(organization)
    })

    it('Should update an organization label', async () => {
      const organization = getRandomOrganization()
      const data = {
        label: 'Ministère du disco',
      }
      Organization.$queueResult(organization)
      Organization.$queueResult(organization)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .put('/m-disc')
        .body(data)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toMatchObject(organization)
    })

    it('Should update an organization activeness', async () => {
      const organization = getRandomOrganization()
      const data = {
        active: false,
      }
      Organization.$queueResult(organization)
      Organization.$queueResult(organization)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .put('/m-disc')
        .body(data)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toMatchObject(organization)
    })

    it('Should return an error if requestor is not admin', async () => {
      const organization = {
        active: false,
        label: 'Ministère du disco',
      }

      Organization.$queueResult(organization)

      const response = await app.inject()
        .put('/m-disc')
        .body(organization)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Vous n\'avez pas les droits administrateurs')
    })
  })
})
