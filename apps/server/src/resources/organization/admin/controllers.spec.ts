import prisma from '../../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { getRandomOrganization, getRandomProject, getRandomUser } from '@cpn-console/test-utils'
import { getConnection, closeConnections } from '../../../connect.js'
import { adminGroupPath, allOrganizations } from '@cpn-console/shared'
import { filteredOrganizations, setRequestor } from '../../../utils/mocks.js'
import app from '../../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../../utils/mocks.js')).mockSessionPlugin)
vi.mock('@cpn-console/hooks', (await import('../../../utils/mocks.js')).mockHooksPackage)

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
  describe('getAllOrganizationsController', () => {
    it('Should retrieve all organizations', async () => {
      const organizations = allOrganizations.map(org => getRandomOrganization(org.name, org.label))

      prisma.organization.findMany.mockResolvedValue(organizations)

      const response = await app.inject()
        .get('/api/v1/admin/organizations')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(organizations)
    })

    it('Should return an error if retrieve organizations failed', async () => {
      prisma.organization.findMany.mockResolvedValue([])

      const response = await app.inject()
        .get('/api/v1/admin/organizations')
        .end()

      expect(response.statusCode).toEqual(404)
      expect(JSON.parse(response.body).error).toEqual('Aucune organisation trouvée')
    })

    it('Should return an error if requestor is not admin', async () => {
      const requestor = getRandomUser()
      setRequestor(requestor)

      const response = await app.inject()
        .get('/api/v1/admin/organizations')
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual('Vous n\'avez pas les droits administrateur')
    })
  })

  describe('createOrganizationController', () => {
    it('Should create an organization', async () => {
      const organization = {
        name: 'myorg',
        label: 'Ministère de la bicyclette',
        source: 'dso',
      }

      prisma.organization.findUnique.mockResolvedValue(null)
      prisma.organization.create.mockResolvedValue(organization)

      const response = await app.inject()
        .post('/api/v1/admin/organizations')
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
        .post('/api/v1/admin/organizations')
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
        .post('/api/v1/admin/organizations')
        .body(organization)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).error).toEqual('Cette organisation existe déjà')
    })

    it('Should return an error if requestor is not admin', async () => {
      const requestor = getRandomUser()
      setRequestor(requestor)

      const response = await app.inject()
        .post('/api/v1/admin/organizations')
        .body(getRandomOrganization())
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual('Vous n\'avez pas les droits administrateur')
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

      const response = await app.inject()
        .put('/api/v1/admin/organizations/m-disc')
        .body(data)
        .end()

      expect(response.statusCode).toEqual(200)
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

      const response = await app.inject()
        .put('/api/v1/admin/organizations/m-disc')
        .body(data)
        .end()

      expect(response.statusCode).toEqual(200)
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

      const response = await app.inject()
        .put('/api/v1/admin/organizations/m-disc')
        .body(data)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toMatchObject(updatedOrg)
    })

    it('Should return an error if requestor is not admin', async () => {
      const requestor = getRandomUser()
      setRequestor(requestor)

      const response = await app.inject()
        .put('/api/v1/admin/organizations/m-disc')
        .body({})
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual('Vous n\'avez pas les droits administrateur')
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
      prisma.adminPlugin.findMany.mockResolvedValueOnce([])
      prisma.log.create.mockResolvedValue({ action: 'Fetch organizations' })
      filteredOrganizations.forEach(org => {
        prisma.organization.create.mockResolvedValue(org)
      })
      prisma.organization.findMany.mockResolvedValueOnce(allOrganizations)

      const response = await app.inject()
        .get('/api/v1/admin/organizations/sync')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(allOrganizations)
    })
  })
})
