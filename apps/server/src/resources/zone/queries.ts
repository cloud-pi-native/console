import type { Zone, Cluster } from '@prisma/client'
import prisma from '@/prisma.js'

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
