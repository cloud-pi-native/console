import type { Zone } from '@cpn-console/shared'
import { linkZoneToClusters } from './queries.js'
import { BadRequest400 } from '@/utils/errors.js'
import prisma from '@/prisma.js'

export const listZones = prisma.zone.findMany

export async function createZone(data: { slug: string, label: string, description?: string | null, clusterIds?: string[] }) {
  const { slug, label, description, clusterIds } = data

  const existingZone = await prisma.zone.findUnique({
    where: { slug },
  })

  if (existingZone) return new BadRequest400(`Une zone portant le nom ${slug} existe déjà.`)
  const zone = await prisma.zone.create({
    data: {
      slug,
      label,
      description,
    },
  })
  if (clusterIds) {
    await linkZoneToClusters(zone.id, clusterIds)
  }

  return zone
}

export async function updateZone(zoneId: Zone['id'], data: Pick<Zone, 'label' | 'description'>) {
  const { label, description } = data

  return prisma.zone.update({
    where: {
      id: zoneId,
    },
    data: {
      label,
      description,
    },
  })
}

export async function deleteZone(zoneId: Zone['id']) {
  const attachedCluster = await prisma.cluster.findFirst({ where: { zoneId }, select: { id: true } })
  if (attachedCluster) return new BadRequest400('Vous ne pouvez supprimer cette zone, car des clusters y sont associés.')

  await prisma.zone.delete({ where: { id: zoneId } })
  return null
}
