import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cluster, Zone } from '@prisma/client'
import prisma from '../../__mocks__/prisma'
import { BadRequest400 } from '../../utils/errors'
import { hook } from '../../__mocks__/utils/hook-wrapper'
import { createZone, deleteZone, listZones, updateZone } from './business'
import * as queries from './queries'

const userId = faker.string.uuid()
const reqId = faker.string.uuid()
const linkZoneToClustersMock = vi.spyOn(queries, 'linkZoneToClusters')
vi.mock('../../utils/hook-wrapper', async () => ({
  hook,
}))

describe('test zone business', () => {
  const zones: Zone[] = [{
    id: faker.string.uuid(),
    label: faker.company.name(),
    argocdUrl: faker.internet.url(),
    createdAt: new Date(),
    updatedAt: new Date(),
    description: faker.lorem.lines(1),
    slug: faker.string.alphanumeric(5),
  }, {
    id: faker.string.uuid(),
    label: faker.company.name(),
    argocdUrl: faker.internet.url(),
    createdAt: new Date(),
    updatedAt: new Date(),
    description: faker.lorem.lines(1),
    slug: faker.string.alphanumeric(6),
  }]

  const clusters: Pick<Cluster, 'id'>[] = [
    { id: faker.string.uuid() },
    { id: faker.string.uuid() },
  ]

  beforeEach(() => {
    vi.resetAllMocks()
  })
  describe('listZones', () => {
    it('should return zones', async () => {
      prisma.zone.findMany.mockResolvedValueOnce(zones)

      const response = await listZones()
      expect(response).toEqual(zones)
    })
  })
  describe('createZone', () => {
    it('should create zone without description and clusterIds', async () => {
      const newZone = { label: zones[0].label, slug: zones[0].slug, argocdUrl: zones[0].argocdUrl }

      hook.zone.upsert.mockResolvedValue({})
      prisma.zone.create.mockResolvedValueOnce(zones[0])
      const response = await createZone(newZone, userId, reqId)

      expect(response).toEqual(zones[0])
      expect(prisma.zone.create).toHaveBeenCalledWith({
        data: {
          slug: newZone.slug,
          label: newZone.label,
          argocdUrl: newZone.argocdUrl,
          description: undefined,
        },
      })
      expect(linkZoneToClustersMock).toHaveBeenCalledTimes(0)
    })
    it('should create zone with description and clusterIds', async () => {
      const newZone = { label: zones[0].label, slug: zones[0].slug, argocdUrl: zones[0].argocdUrl, clusterIds: clusters.map(({ id }) => id), description: faker.lorem.lines(2) }

      hook.zone.upsert.mockResolvedValue({})
      prisma.zone.create.mockResolvedValueOnce(zones[0])
      const response = await createZone(newZone, userId, reqId)

      expect(response).toEqual(zones[0])
      expect(prisma.zone.create).toHaveBeenCalledWith({
        data: {
          description: newZone.description,
          label: newZone.label,
          argocdUrl: newZone.argocdUrl,
          slug: newZone.slug,
        },
      })
      expect(linkZoneToClustersMock).toHaveBeenCalledTimes(1)
    })
    it('should not create zone, conflict label', async () => {
      const newZone = { label: zones[0].label, slug: zones[0].slug, argocdUrl: zones[0].argocdUrl }

      prisma.zone.findUnique.mockResolvedValueOnce(zones[0])
      prisma.zone.create.mockResolvedValueOnce(zones[0])
      const response = await createZone(newZone, userId, reqId)

      expect(response).instanceOf(BadRequest400)
      expect(prisma.zone.create).toHaveBeenCalledTimes(0)
      expect(linkZoneToClustersMock).toHaveBeenCalledTimes(0)
    })
  })
  describe('updateZone', () => {
    it('should filter keys and update zone', async () => {
      prisma.zone.update.mockResolvedValueOnce(zones[0])
      hook.zone.upsert.mockResolvedValue({})
      await updateZone(zones[0].id, {
        description: '',
        label: zones[0].label,
        argocdUrl: zones[0].argocdUrl,
        extraKey: 1,
      }, userId, reqId)
      expect(prisma.zone.update).toHaveBeenCalledWith({ where: { id: zones[0].id }, data: {
        description: '',
        label: zones[0].label,
        argocdUrl: zones[0].argocdUrl,
      } })
    })
  })
  describe('deleteZone', () => {
    it('should not delete zone, cluster attached', async () => {
      prisma.cluster.findFirst.mockResolvedValueOnce(clusters[0])
      const response = await deleteZone(zones[0].id, userId, reqId)
      expect(response).instanceOf(BadRequest400)
      expect(prisma.cluster.delete).toHaveBeenCalledTimes(0)
    })
    it('should delete zone', async () => {
      prisma.cluster.findFirst.mockResolvedValueOnce(undefined)
      hook.zone.delete.mockResolvedValue({})
      const response = await deleteZone(zones[0].id, userId, reqId)
      expect(response).toEqual(null)
      expect(prisma.zone.delete).toHaveBeenCalledTimes(1)
    })
  })
})
