import type { User, Zone } from '@cpn-console/shared'
import { addLogs } from '../queries-index'
import { linkZoneToClusters } from './queries'
import { BadRequest400, Unprocessable422 } from '@old-server/utils/errors'
import prisma from '@old-server/prisma'
import { hook } from '@old-server/utils/hook-wrapper'

export const listZones = prisma.zone.findMany

export async function createZone(
  data: { slug: string, label: string, argocdUrl: string, description?: string | null, clusterIds?: string[] },
  userId: User['id'],
  requestId: string,
) {
  const { slug, label, argocdUrl, description, clusterIds } = data

  const existingZone = await prisma.zone.findUnique({
    where: { slug },
  })

  if (existingZone) return new BadRequest400(`Une zone portant le nom ${slug} existe déjà.`)
  const zone = await prisma.zone.create({
    data: {
      slug,
      label,
      argocdUrl,
      description,
    },
  })
  if (clusterIds) {
    await linkZoneToClusters(zone.id, clusterIds)
  }
  const hookReply = await hook.zone.upsert(zone.id)
  await addLogs({ action: 'Create zone', data: hookReply, userId, requestId })
  if (hookReply.failed) {
    return new Unprocessable422('Echec des services lors de la création de la zone')
  }
  return zone
}

export async function updateZone(
  zoneId: Zone['id'],
  data: Pick<Zone, 'label' | 'argocdUrl' | 'description'>,
  userId: User['id'],
  requestId: string,
) {
  const { label, argocdUrl, description } = data

  const updatedZone = await prisma.zone.update({
    where: {
      id: zoneId,
    },
    data: {
      label,
      argocdUrl,
      description,
    },
  })
  const hookReply = await hook.zone.upsert(updatedZone.id)
  await addLogs({ action: 'Update zone', data: hookReply, userId, requestId })
  if (hookReply.failed) {
    return new Unprocessable422('Echec des services lors de la mise à jour de la zone')
  }
  return updatedZone
}

export async function deleteZone(zoneId: Zone['id'], userId: User['id'], requestId: string) {
  const attachedCluster = await prisma.cluster.findFirst({ where: { zoneId }, select: { id: true } })
  if (attachedCluster) return new BadRequest400('Vous ne pouvez supprimer cette zone, car des clusters y sont associés.')

  const hookReply = await hook.zone.delete(zoneId)
  await addLogs({ action: 'Delete zone', data: hookReply, userId, requestId })
  if (hookReply.failed) {
    return new Unprocessable422('Echec des services lors de la suppression de la zone')
  }
  await prisma.zone.delete({ where: { id: zoneId } })
  return null
}
