import prisma from '@/prisma.js'
import type { Zone, Cluster } from '@prisma/client'

// GET
export const getZoneById = async (zoneId) => prisma.zone.findUnique({
  where: {
    id: zoneId,
  },
  include: {
    clusters: true,
  },
})

export const getZoneBySlug = async (slug: string) => prisma.zone.findUnique({
  where: {
    slug,
  },
})

// CREATE
export const createZone = async ({ slug, label, description }) => {
  return prisma.zone.create({
    data: {
      slug,
      label,
      description,
    },
  })
}

// UPDATE
export const updateZone = async (zoneId: Zone['id'], { label, description }) => prisma.zone.update({
  where: {
    id: zoneId,
  },
  data: {
    label,
    description,
  },
})

export const linkZoneToClusters = (zoneId: Zone['id'], clusterIds: Cluster['id'][]) => prisma.zone.update({
  where: {
    id: zoneId,
  },
  data: {
    clusters: {
      connect: clusterIds.map(clusterId => ({ id: clusterId })),
    },
  },
})

// DELETE
export const deleteZone = async (zoneId: Zone['id']) => {
  return prisma.zone.delete({
    where: {
      id: zoneId,
    },
  })
}

export const _dropZoneTable = async () => {
  await prisma.zone.deleteMany({})
}
