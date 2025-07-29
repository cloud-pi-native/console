import type { Cluster, Zone } from '@prisma/client'
import prisma from '@/prisma'

export function getZoneByIdOrThrow(id: Zone['id']) {
  return prisma.zone.findUniqueOrThrow({
    where: { id },
  })
}

export function linkZoneToClusters(zoneId: Zone['id'], clusterIds: Cluster['id'][]) {
  return prisma.zone.update({
    where: {
      id: zoneId,
    },
    data: {
      clusters: {
        connect: clusterIds.map(clusterId => ({ id: clusterId })),
      },
    },
  })
}
