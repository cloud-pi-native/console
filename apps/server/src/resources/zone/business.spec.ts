import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cluster, Zone } from '@prisma/client'
import prisma from '../../__mocks__/prisma.js'
import { BadRequest400 } from '../../utils/errors.ts'
import { createZone, deleteZone, listZones, updateZone } from './business.ts'
import * as queries from './queries.js'

const linkZoneToClustersMock = vi.spyOn(queries, 'linkZoneToClusters')

describe('test zone business', () => {
  const zones: Zone[] = [{
    id: faker.string.uuid(),
    label: faker.company.name(),
    createdAt: new Date(),
    updatedAt: new Date(),
    description: faker.lorem.lines(1),
    slug: faker.string.alphanumeric(5),
  }, {
    id: faker.string.uuid(),
    label: faker.company.name(),
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
      const newZone = { label: zones[0].label, slug: zones[0].slug }

      prisma.zone.create.mockResolvedValueOnce(zones[0])
      const response = await createZone(newZone)

      expect(response).toEqual(zones[0])
      expect(prisma.zone.create).toHaveBeenCalledWith({
        data: {
          description: undefined,
          label: newZone.label,
          slug: newZone.slug,
        },
      })
      expect(linkZoneToClustersMock).toHaveBeenCalledTimes(0)
    })
    it('should create zone with description and clusterIds', async () => {
      const newZone = { label: zones[0].label, slug: zones[0].slug, clusterIds: clusters.map(({ id }) => id), description: faker.lorem.lines(2) }

      prisma.zone.create.mockResolvedValueOnce(zones[0])
      const response = await createZone(newZone)

      expect(response).toEqual(zones[0])
      expect(prisma.zone.create).toHaveBeenCalledWith({
        data: {
          description: newZone.description,
          label: newZone.label,
          slug: newZone.slug,
        },
      })
      expect(linkZoneToClustersMock).toHaveBeenCalledTimes(1)
    })
    it('should not create zone, conflict label', async () => {
      const newZone = { label: zones[0].label, slug: zones[0].slug }

      prisma.zone.findUnique.mockResolvedValueOnce(zones[0])
      prisma.zone.create.mockResolvedValueOnce(zones[0])
      const response = await createZone(newZone)

      expect(response).instanceOf(BadRequest400)
      expect(prisma.zone.create).toHaveBeenCalledTimes(0)
      expect(linkZoneToClustersMock).toHaveBeenCalledTimes(0)
    })
  })
  describe('updateZone', () => {
    it('should filter keys and update zone', async () => {
      await updateZone(zones[0].id, {
        description: '',
        label: zones[0].label,
        extraKey: 1,
      })
      expect(prisma.zone.update).toHaveBeenCalledWith({ where: { id: zones[0].id }, data: {
        description: '',
        label: zones[0].label,
      } })
    })
  })
  describe('deleteZone', () => {
    it('should not delete zone, cluster attached', async () => {
      prisma.cluster.findFirst.mockResolvedValueOnce(clusters[0])
      const response = await deleteZone(zones[0].id)
      expect(response).instanceOf(BadRequest400)
      expect(prisma.cluster.delete).toHaveBeenCalledTimes(0)
    })
    it('should delete zone', async () => {
      prisma.cluster.findFirst.mockResolvedValueOnce(undefined)
      const response = await deleteZone(zones[0].id)
      expect(response).toEqual(null)
      expect(prisma.zone.delete).toHaveBeenCalledTimes(1)
    })
  })
})
