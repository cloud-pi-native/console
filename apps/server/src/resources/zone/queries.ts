import type { Zone, Cluster } from '@prisma/client'
import prisma from '@/prisma.js'

// GET
export const listZones = () =>
  prisma.zone.findMany({
    include: { clusters: { select: { id: true } } },
  })

// GET
export const getZoneById = (zoneId: Zone['id']) =>
  prisma.zone.findUnique({
    where: {
      id: zoneId,
    },
    include: {
      clusters: true,
    },
  })

export const getZoneBySlug = (slug: Zone['slug']) =>
  prisma.zone.findUnique({
    where: {
      slug,
    },
  })

// CREATE
export const createZone = ({ slug, label, description }: Parameters<typeof prisma.zone.create>[0]['data']) =>
  prisma.zone.create({
    data: {
      slug,
      label,
      description,
    },
  })

// UPDATE
export const updateZone = (
  zoneId: Zone['id'],
  { label, description }: { label: string | undefined, description: string | null | undefined }) =>
  prisma.zone.update({
    where: {
      id: zoneId,
    },
    data: {
      label,
      description,
    },
  })

export const linkZoneToClusters = (zoneId: Zone['id'], clusterIds: Cluster['id'][]) =>
  prisma.zone.update({
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
export const deleteZone = (zoneId: Zone['id']) =>
  prisma.zone.delete({
    where: {
      id: zoneId,
    },
  })

export const _dropZoneTable = prisma.zone.deleteMany
