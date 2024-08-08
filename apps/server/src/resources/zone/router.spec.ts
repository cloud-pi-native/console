import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Zone, zoneContract } from '@cpn-console/shared'
import app from '../../app.js'
import * as business from './business.js'
import * as utilsController from '../../utils/controller.js'
import { faker } from '@faker-js/faker'
import { getUserMockInfos } from '../../utils/mocks.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessListMock = vi.spyOn(business, 'listZones')
const businessCreateMock = vi.spyOn(business, 'createZone')
const businessUpdateMock = vi.spyOn(business, 'updateZone')
const businessDeleteMock = vi.spyOn(business, 'deleteZone')

describe('Test zoneContract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('listZones', () => {
    it('Should return list of zones', async () => {
      const zones = []
      businessListMock.mockResolvedValueOnce(zones)

      const response = await app.inject()
        .get(zoneContract.listZones.path)
        .end()

      expect(businessListMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(zones)
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('createZone', () => {
    const zone = { id: faker.string.uuid(), label: faker.string.alpha({ length: 5 }), slug: faker.string.alpha({ length: 5, casing: 'lower' }), description: '' }

    it('Should create and return zone for admin', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateMock.mockResolvedValueOnce(zone)
      const response = await app.inject()
        .post(zoneContract.createZone.path)
        .body(zone)
        .end()

      expect(businessCreateMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(zone)
      expect(response.statusCode).toEqual(201)
    })
    it('Should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateMock.mockResolvedValueOnce(new utilsController.BadRequest400('une erreur'))
      const response = await app.inject()
        .post(zoneContract.createZone.path)
        .body(zone)
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('Should return 403 for non-admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(zoneContract.createZone.path)
        .body(zone)
        .end()

      expect(businessCreateMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })

  describe('updateZone', () => {
    const zoneId = faker.string.uuid()
    const zone: Omit<Zone, 'id'> = { label: faker.string.alpha({ length: 5 }), slug: faker.string.alpha({ length: 5, casing: 'lower' }), description: '' }

    it('Should update and return zone for admin', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce({ id: zoneId, ...zone })
      const response = await app.inject()
        .put(zoneContract.updateZone.path.replace(':zoneId', zoneId))
        .body(zone)
        .end()

      expect(businessUpdateMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual({ id: zoneId, ...zone })
      expect(response.statusCode).toEqual(200)
    })
    it('Should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce(new utilsController.BadRequest400('une erreur'))
      const response = await app.inject()
        .put(zoneContract.updateZone.path.replace(':zoneId', zoneId))
        .body(zone)
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('Should return 403 for non-admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(zoneContract.updateZone.path.replace(':zoneId', zoneId))
        .body(zone)
        .end()

      expect(businessUpdateMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })

  describe('deleteZone', () => {
    it('Should delete zone for admin', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessDeleteMock.mockResolvedValueOnce(null)
      const response = await app.inject()
        .delete(zoneContract.deleteZone.path.replace(':zoneId', faker.string.uuid()))
        .end()

      expect(businessDeleteMock).toHaveBeenCalledTimes(1)
      expect(response.body).toBeFalsy()
      expect(response.statusCode).toEqual(204)
    })
    it('Should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessDeleteMock.mockResolvedValueOnce(new utilsController.BadRequest400('une erreur'))
      const response = await app.inject()
        .delete(zoneContract.deleteZone.path.replace(':zoneId', faker.string.uuid()))
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('Should return 403 for non-admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(zoneContract.deleteZone.path.replace(':zoneId', faker.string.uuid()))
        .end()

      expect(businessDeleteMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })
})