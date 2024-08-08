import { type Zone } from '@cpn-console/shared'
import {
  listZones as listZonesQuery,
  createZone as createZoneQuery,
  updateZone as updateZoneQuery,
  deleteZone as deleteZoneQuery,
  linkZoneToClusters,
  getZoneBySlug,
} from './queries.js'
import { BadRequest400 } from '@/utils/errors.js'
import prisma from '@/prisma.js'

export const listZones = async () => {
  const zones = await listZonesQuery()
  return zones.map(({ clusters, ...zone }) => ({
    ...zone,
    clusterIds: clusters.map(({ id }) => id),
  }))
}

export const createZone = async (
  data: { slug: string, label: string, description?: string | null, clusterIds?: string[] },
) => {
  const { slug, label, description, clusterIds } = data

  const existingZone = await getZoneBySlug(slug)
  if (existingZone) return new BadRequest400(`Une zone portant le nom ${slug} existe déjà.`)
  const zone = await createZoneQuery({ slug, label, description })
  if (clusterIds) {
    await linkZoneToClusters(zone.id, clusterIds)
  }

  return zone
}

export const updateZone = async (zoneId: Zone['id'], data: Pick<Zone, 'label' | 'description'>) => {
  const { label, description } = data

  return updateZoneQuery(zoneId, { label, description })
}

export const deleteZone = async (zoneId: Zone['id']) => {
  const attachedCluster = await prisma.cluster.findFirst({ where: { zoneId }, select: { id: true } })
  if (attachedCluster) return new BadRequest400('Vous ne pouvez supprimer cette zone, car des clusters y sont associés.')

  await deleteZoneQuery(zoneId)
  return null
}
