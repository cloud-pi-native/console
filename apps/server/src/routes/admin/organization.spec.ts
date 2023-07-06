import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { getRandomOrganization } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../../utils/keycloak'
import { getConnection, closeConnections } from '../../connect.js'
import organizationRouter from './organization.js'
import { adminGroupPath, allOrganizations } from 'shared'
import { fetchOrganizationsRes, filteredOrganizations } from '../../utils/mock-plugins.js'
import { checkAdminGroup } from '../../utils/controller.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))

vi.mock('../../plugins/index.js', async () => {
  return {
    hooks: {
      fetchOrganizations: { execute: () => fetchOrganizationsRes },
    },
  }
})

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
    .register(organizationRouter)
}

describe.skip('Organizations routes', () => {
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
  describe('getAllOrganizationsController', () => {
    it('Should retrieve all organizations', async () => {
      const organizations = allOrganizations.map(org => getRandomOrganization(org.name, org.label))

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(organizations)
    })

    it('Should return an error if retrieve organizations failed', async () => {
      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/')
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body).toEqual('Echec de la récupération des organisations')
    })

    it('Should return an error if requestor is not admin', async () => {
      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Vous n\'avez pas les droits administrateur')
    })
  })

  describe('createOrganizationController', () => {
    it('Should create an organization', async () => {
      const organization = {
        name: 'my-org',
        label: 'Ministère de la bicyclette',
      }

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
      expect(response.body).toEqual('Echec de la création de l\'organisation')
    })

    it('Should return an error if organization already exists', async () => {
      const organization = {
        name: 'my-org',
        label: 'Ministère de l\'italo-disco',
      }

      const response = await app.inject({ headers: { admin: 'admin' } })
        .post('/')
        .body(organization)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toEqual('Echec de la création de l\'organisation')
    })

    it('Should return an error if requestor is not admin', async () => {
      const organization = {
        name: 'my-org',
        label: 'Ministère de l\'italo-disco',
      }

      const response = await app.inject()
        .post('/')
        .body(organization)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Vous n\'avez pas les droits administrateur')
    })
  })

  describe('updateOrganizationController', () => {
    it('Should update an organization label and activeness', async () => {
      const organization = getRandomOrganization()
      const data = {
        active: false,
        label: 'Ministère du disco',
      }
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

      const response = await app.inject()
        .put('/m-disc')
        .body(organization)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Vous n\'avez pas les droits administrateur')
    })
  })

  describe('fetchOrganizationsController', () => {
    it('Should fetch organizations from external plugins', async () => {
      const organizations = [getRandomOrganization()]
      const allOrganizations = [
        ...organizations,
        ...filteredOrganizations,
      ]
      filteredOrganizations.forEach(externalOrg => {})

      const response = await app.inject({ headers: { admin: 'admin' } })
        .put('sync/organizations')
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.body).toEqual(JSON.stringify(allOrganizations))
    })
  })
})
