import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { User, getRandomOrganization, getRandomProject, getRandomUser } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../../utils/keycloak.js'
import { getConnection, closeConnections } from '../../connect.js'
import organizationRouter from './organization.js'
import { adminGroupPath, allOrganizations } from 'shared'
import { fetchOrganizationsRes, filteredOrganizations } from '../../utils/mock-plugins.js'
import { checkAdminGroup } from '../../utils/controller.js'
import prisma from '../../__mocks__/prisma.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))
vi.mock('../../prisma.js')
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
  describe('getAllOrganizationsController', () => {
    it('Should retrieve all organizations', async () => {
      const organizations = allOrganizations.map(org => getRandomOrganization(org.name, org.label))

      prisma.organization.findMany.mockResolvedValue(organizations)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(organizations)
    })

    it('Should return an error if retrieve organizations failed', async () => {

      prisma.organization.findMany.mockResolvedValue([])

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/')
        .end()

      expect(response.statusCode).toEqual(404)
      expect(JSON.parse(response.body).message).toEqual('Aucune organisation trouvée')
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

      prisma.organization.findUnique.mockResolvedValue(null)
      prisma.organization.create.mockResolvedValue(organization)

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

      prisma.organization.findUnique.mockResolvedValue(null)

      const response = await app.inject({ headers: { admin: 'admin' } })
      .post('/')
      .body(organization)
      .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).message).toEqual('"name" length must be less than or equal to 10 characters long')
    })

    it('Should return an error if organization already exists', async () => {
      const organization = {
        name: 'my-org',
        label: 'Ministère de l\'italo-disco',
      }

      prisma.organization.findUnique.mockResolvedValue(organization)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .post('/')
        .body(organization)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).message).toEqual('Cette organisation existe déjà')
    })

    it('Should return an error if requestor is not admin', async () => {
      const response = await app.inject()
        .post('/')
        .body({})
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
      const updatedOrg = {
        ...data,
        id: organization.id,
        name: organization.name,
        source: organization.source,
      }

      prisma.organization.findUnique.mockResolvedValueOnce(organization)
      prisma.organization.update.mockResolvedValue(updatedOrg)
      prisma.project.findMany.mockResolvedValue([])
      prisma.organization.findUnique.mockResolvedValueOnce(updatedOrg)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .put('/m-disc')
        .body(data)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toMatchObject(updatedOrg)
    })

    it('Should update an organization label', async () => {
      const organization = getRandomOrganization()
      const data = {
        label: 'Ministère du disco',
      }
      const updatedOrg = {
        ...data,
        id: organization.id,
        name: organization.name,
        active: organization.active,
        source: organization.source,
      }

      prisma.organization.findUnique.mockResolvedValueOnce(organization)
      prisma.organization.update.mockResolvedValue(updatedOrg)
      prisma.organization.findUnique.mockResolvedValueOnce(updatedOrg)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .put('/m-disc')
        .body(data)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toMatchObject(updatedOrg)
    })

    it('Should update an organization activeness', async () => {
      const organization = getRandomOrganization()
      const project = getRandomProject(organization.id)
      const data = {
        active: false,
      }
      const updatedOrg = {
        ...data,
        id: organization.id,
        name: organization.name,
        label: organization.label,
        source: organization.source,
      }

      prisma.organization.findUnique.mockResolvedValueOnce(organization)
      prisma.organization.update.mockResolvedValue(updatedOrg)
      prisma.project.findMany.mockResolvedValue([project])
      prisma.project.update.mockResolvedValue(project)
      prisma.organization.findUnique.mockResolvedValueOnce(updatedOrg)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .put('/m-disc')
        .body(data)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toMatchObject(updatedOrg)
    })

    it('Should return an error if requestor is not admin', async () => {
      const response = await app.inject()
        .put('/m-disc')
        .body({})
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

      prisma.organization.findMany.mockResolvedValueOnce(organizations)
      prisma.log.create.mockResolvedValue({ action: 'Fetch organizations' })
      filteredOrganizations.forEach(org => {
        prisma.organization.create.mockResolvedValue(org)
      })
      prisma.organization.findMany.mockResolvedValueOnce(allOrganizations)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .put('sync/organizations')
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.body).toEqual(JSON.stringify(allOrganizations))
    })
  })
})
