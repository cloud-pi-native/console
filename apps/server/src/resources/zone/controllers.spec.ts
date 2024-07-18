import prisma from '../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { faker } from '@faker-js/faker'
import { adminGroupPath } from '@cpn-console/shared'
import { getRandomCluster, getRandomUser, getRandomZone } from '@cpn-console/test-utils'
import { getConnection, closeConnections } from '../../connect.js'
import { setRequestor } from '../../utils/mocks.js'
import app from '../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)

describe('Zone routes', () => {
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
  describe('listZonesController', () => {
    it('Should retrieve all zones', async () => {
      const zones = []

      prisma.zone.findMany.mockResolvedValue(zones)

      const response = await app.inject()
        .get('/api/v1/zones')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual([])
    })
  })

  // POST
  describe('createZonesController', () => {
    it('Should create a new zone', async () => {
      const zone = { label: 'Zone à Défendre', slug: 'zad' }
      const zoneCreated = {
        ...zone,
        id: faker.string.uuid(),
        description: '',
      }
      prisma.zone.findUnique.mockResolvedValue(null)
      prisma.zone.create.mockResolvedValue(zoneCreated)

      const response = await app.inject()
        .post('/api/v1/zones')
        .body(zone)
        .end()

      expect(response.json()).toEqual(zoneCreated)
      expect(response.statusCode).toEqual(201)
    })

    it('Should create a new zone with associated clusters', async () => {
      const zone = { label: 'Zone à Défendre', slug: 'zad', clusterIds: [getRandomCluster({}).id] }
      const zoneCreated = {
        label: zone.label,
        slug: zone.slug,
        id: faker.string.uuid(),
        description: '',
      }
      prisma.zone.findUnique.mockResolvedValue(null)
      prisma.zone.create.mockResolvedValue(zoneCreated)
      prisma.zone.update.mockResolvedValue(undefined)

      const response = await app.inject()
        .post('/api/v1/zones')
        .body(zone)
        .end()

      // update means clusterIds are linked
      expect(prisma.zone.update).toHaveBeenCalled()
      expect(response.statusCode).toEqual(201)
      expect(response.json()).toEqual(zoneCreated)
    })

    it('Should not create a a zone if slug is already taken', async () => {
      const zone = { label: 'Zone à Défendre', slug: 'zad', clusterIds: [getRandomCluster({}).id] }

      prisma.zone.findUnique.mockResolvedValue(zone)
      const response = await app.inject()
        .post('/api/v1/zones')
        .body(zone)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).error).toEqual(`Une zone portant le nom ${zone.slug} existe déjà.`)
    })
  })

  // PUT
  describe('updateZonesController', () => {
    it('Should update a zone', async () => {
      const zone = getRandomZone()

      prisma.zone.update.mockResolvedValue(zone)
      prisma.zone.findUnique.mockResolvedValue(zone)

      const response = await app.inject()
        .put(`/api/v1/zones/${zone.id}`)
        .body(zone)
        .end()

      expect(response.json()).toEqual(zone)
      expect(response.statusCode).toEqual(201)
    })
  })

  // DELETE
  describe('deleteZonesController', () => {
    it('Should delete a zone', async () => {
      const zone = getRandomZone()

      prisma.zone.findUnique.mockResolvedValue(zone)
      prisma.zone.delete.mockResolvedValue(zone)

      const response = await app.inject()
        .delete(`/api/v1/zones/${zone.id}`)
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should not delete a zone with associated clusters', async () => {
      const zone = {
        ...getRandomZone(),
        get clusters () {
          return [getRandomCluster({ zoneId: this.id })]
        },
      }

      prisma.zone.findUnique.mockResolvedValue(zone)

      const response = await app.inject()
        .delete(`/api/v1/zones/${zone.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().error).toEqual('Vous ne pouvez supprimer cette zone, car des clusters y sont associés.')
    })
  })
})
