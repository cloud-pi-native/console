import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Organization, organizationContract } from '@cpn-console/shared'
import app from '../../app.js'
import * as business from './business.js'
import * as utilsController from '../../utils/controller.js'
import { faker } from '@faker-js/faker'
import { getUserMockInfos } from '../../utils/mocks.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessListMock = vi.spyOn(business, 'listOrganizations')
const businessCreateMock = vi.spyOn(business, 'createOrganization')
const businessFetchMock = vi.spyOn(business, 'fetchOrganizations')
const businessUpdateMock = vi.spyOn(business, 'updateOrganization')

describe('Test organizationContract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('listOrganizations', () => {
    it('Should return list of organizations', async () => {
      const organizations = []
      businessListMock.mockResolvedValueOnce(organizations)

      const response = await app.inject()
        .get(organizationContract.listOrganizations.path)
        .end()

      expect(businessListMock).toHaveBeenCalledWith({})
      expect(response.json()).toEqual(organizations)
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('createOrganization', () => {
    const organization: Organization = { id: faker.string.uuid(), name: faker.string.alpha({ length: 5, casing: 'lower' }), label: faker.string.alpha({ length: 5, casing: 'lower' }), source: 'console', createdAt: (new Date()).toISOString(), updatedAt: (new Date()).toISOString(), active: true }

    it('Should return created organization', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateMock.mockResolvedValueOnce(organization)
      const response = await app.inject()
        .post(organizationContract.createOrganization.path)
        .body(organization)
        .end()

      expect(response.json()).toEqual(organization)
      expect(response.statusCode).toEqual(201)
    })

    it('Should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateMock.mockResolvedValueOnce(new utilsController.BadRequest400('une erreur'))
      const response = await app.inject()
        .post(organizationContract.createOrganization.path)
        .body(organization)
        .end()

      expect(response.statusCode).toEqual(400)
    })

    it('Should return 403 if not admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(organizationContract.createOrganization.path)
        .body(organization)
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })

  describe('syncOrganizations', () => {
    it('Should sync organizations', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      const organizations = []
      businessFetchMock.mockResolvedValueOnce(organizations)

      const response = await app.inject()
        .get(organizationContract.syncOrganizations.path)
        .end()

      expect(businessFetchMock).toHaveBeenCalledWith(user.user.id, expect.any(String))
      expect(response.json()).toEqual(organizations)
      expect(response.statusCode).toEqual(200)
    })

    it('Should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessFetchMock.mockResolvedValueOnce(new utilsController.Unprocessable422('une erreur'))
      const response = await app.inject()
        .get(organizationContract.syncOrganizations.path)
        .end()

      expect(response.statusCode).toEqual(422)
    })

    it('Should return 403 if not admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(organizationContract.syncOrganizations.path)
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })

  describe('updateOrganization', () => {
    const organization: Organization = { id: faker.string.uuid(), name: faker.string.alpha({ length: 5, casing: 'lower' }), label: faker.string.alpha({ length: 5, casing: 'lower' }), source: 'console', createdAt: (new Date()).toISOString(), updatedAt: (new Date()).toISOString(), active: true }

    it('Should return updated organization', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce(organization)
      const response = await app.inject()
        .put(organizationContract.updateOrganization.path.replace(':organizationName', organization.name))
        .body(organization)
        .end()

      expect(response.json()).toEqual(organization)
      expect(response.statusCode).toEqual(200)
    })

    it('Should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce(new utilsController.BadRequest400('une erreur'))
      const response = await app.inject()
        .put(organizationContract.updateOrganization.path.replace(':organizationName', organization.name))
        .body(organization)
        .end()

      expect(response.statusCode).toEqual(400)
    })

    it('Should return 403 if not admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(organizationContract.updateOrganization.path.replace(':organizationName', organization.name))
        .body(organization)
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })
})