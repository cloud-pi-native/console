import prisma from '../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { getRandomOrganization, getRandomUser } from '@cpn-console/test-utils'
import { getConnection, closeConnections } from '../../connect.js'
import { setRequestor, filteredOrganizations } from '../../utils/mocks.js'
import app from '../../app.js'
import { faker } from '@faker-js/faker'
import { adminGroupPath } from '@cpn-console/shared'

vi.mock('@cpn-console/hooks', (await import('../../utils/mocks.js')).mockHooksPackage)
vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)

describe('Organization routes', () => {
  beforeAll(async () => {
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
      const organizations = [{
        ...getRandomOrganization(),
        updatedAt: (new Date()).toISOString(),
        createdAt: (new Date()).toISOString(),
      }]

      prisma.organization.findMany.mockResolvedValueOnce(organizations)

      const response = await app.inject()
        .get('/api/v1/organizations')
        .end()
      expect(response.json()).toStrictEqual(organizations)
      expect(response.statusCode).toEqual(200)
    })
  })
})

describe('Admin organization routes', () => {
  beforeAll(async () => {
    await getConnection()
  })

  afterAll(async () => {
    return closeConnections()
  })

  beforeEach(() => {
    const requestor = { ...getRandomUser(), groups: [adminGroupPath] }
    setRequestor(requestor)

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // GET
  describe('createOrganizationController', () => {
    it('Should create an organization', async () => {
      const organization = {
        name: 'myorg',
        label: 'Ministère de la bicyclette',
        source: 'dso',
        updatedAt: (new Date()).toISOString(),
        createdAt: (new Date()).toISOString(),
      }

      prisma.organization.findUnique.mockResolvedValue(null)
      prisma.organization.create.mockResolvedValue(organization)

      const response = await app.inject()
        .post('/api/v1/organizations')
        .body(organization)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toMatchObject(organization)
    })

    it('Should return an error if name is too long', async () => {
      const organization = {
        name: 'anticonstitutionnellement',
        label: 'Ministère de l\'anti-constitutionnalité',
        source: 'dso',
      }

      prisma.organization.findUnique.mockResolvedValue(null)

      const response = await app.inject()
        .post('/api/v1/organizations')
        .body(organization)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).bodyErrors.issues[0].message).toEqual('String must contain at most 10 character(s)')
    })

    it('Should return an error if organization already exists', async () => {
      const organization = {
        name: 'myorg',
        label: 'Ministère de l\'italo-disco',
        source: 'dso',
      }

      prisma.organization.findUnique.mockResolvedValue(organization)

      const response = await app.inject()
        .post('/api/v1/organizations')
        .body(organization)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).error).toEqual('Cette organisation existe déjà')
    })

    it('Should return an error if requestor is not admin', async () => {
      const requestor = { ...getRandomUser(), groups: [] }
      setRequestor(requestor)

      const response = await app.inject()
        .post('/api/v1/organizations')
        .body(getRandomOrganization())
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual('Vous n\'avez pas les droits administrateur')
    })
  })

  describe('Update organization route', () => {
    it('Should update label and activeness', async () => {
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
        updatedAt: (new Date()).toISOString(),
        createdAt: (new Date()).toISOString(),
      }

      prisma.organization.findUnique.mockResolvedValueOnce(organization)
      prisma.project.updateMany.mockResolvedValue([])
      prisma.organization.update.mockResolvedValue(updatedOrg)

      const response = await app.inject()
        .put('/api/v1/organizations/m-disc')
        .body(data)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toMatchObject(updatedOrg)
    })

    it('Should return an error if requestor is not admin', async () => {
      const requestor = { ...getRandomUser(), groups: [] }
      setRequestor(requestor)

      const response = await app.inject()
        .put('/api/v1/organizations/m-disc')
        .body({})
        .end()

      expect(JSON.parse(response.body).error).toEqual('Vous n\'avez pas les droits administrateur')
      expect(response.statusCode).toEqual(403)
    })
  })

  describe('Sync organizations route', () => {
    it('Should fetch organizations from external plugins', async () => {
      const organizations = [{
        ...getRandomOrganization(),
        id: faker.string.uuid(),
        updatedAt: (new Date()).toISOString(),
        createdAt: (new Date()).toISOString(),
        active: faker.datatype.boolean(),
      }]

      const allOrganizations = [
        ...organizations,
        ...filteredOrganizations,
      ].map(org => ({
        ...org,
        id: faker.string.uuid(),
        updatedAt: (new Date()).toISOString(),
        createdAt: (new Date()).toISOString(),
        active: faker.datatype.boolean(),
      }))

      prisma.organization.findMany.mockResolvedValueOnce(organizations)
      prisma.adminPlugin.findMany.mockResolvedValueOnce([])
      prisma.log.create.mockResolvedValue({ action: 'Fetch organizations' })
      filteredOrganizations.forEach((org) => {
        prisma.organization.create.mockResolvedValue(org)
      })
      prisma.organization.findMany.mockResolvedValueOnce(allOrganizations)

      const response = await app.inject()
        .get('/api/v1/organizations/sync')
        .end()

      expect(response.json()).toEqual(allOrganizations)
      expect(response.statusCode).toEqual(200)
    })

    it('Should return an error if requestor is not admin', async () => {
      const requestor = { ...getRandomUser(), groups: [] }
      setRequestor(requestor)

      const response = await app.inject()
        .get('/api/v1/organizations/sync')
        .body({})
        .end()

      expect(JSON.parse(response.body).error).toEqual('Vous n\'avez pas les droits administrateur')
      expect(response.statusCode).toEqual(403)
    })
  })
})
