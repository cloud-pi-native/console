import type { Cluster, Prisma } from '@prisma/client'

export const zoneSelect = {
  id: true,
  slug: true,
  label: true,
  argocdUrl: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ZoneSelect

export type Zone = Prisma.ZoneGetPayload<{
  select: typeof zoneSelect
}>

export function getZoneById(tx: Prisma.TransactionClient, id: Zone['id']) {
  return tx.zone.findUnique({ where: { id }, select: zoneSelect })
}

export function listZones(tx: Prisma.TransactionClient) {
  return tx.zone.findMany({ select: zoneSelect })
}

export function createZone(
  tx: Prisma.TransactionClient,
  data: Pick<Zone, 'slug' | 'label' | 'argocdUrl' | 'description'>,
) {
  return tx.zone.create({ data, select: zoneSelect })
}

export function updateZone(
  tx: Prisma.TransactionClient,
  zoneId: Zone['id'],
  data: Pick<Zone, 'label' | 'argocdUrl' | 'description'>,
) {
  return tx.zone.update({ where: { id: zoneId }, data, select: zoneSelect })
}

export function deleteZone(tx: Prisma.TransactionClient, zoneId: Zone['id']) {
  return tx.zone.delete({ where: { id: zoneId } })
}

export function linkZoneToClusters(tx: Prisma.TransactionClient, zoneId: Zone['id'], clusterIds: Array<Cluster['id']>) {
  return tx.zone.update({
    where: { id: zoneId },
    data: { clusters: { connect: clusterIds.map(id => ({ id })) } },
    select: zoneSelect,
  })
}

export async function createZoneWithClusters(
  tx: Prisma.TransactionClient,
  data: Pick<Zone, 'slug' | 'label' | 'argocdUrl' | 'description'>,
  clusterIds?: Array<Cluster['id']>,
) {
  const zone = await createZone(tx, data)
  if (clusterIds?.length) {
    await linkZoneToClusters(tx, zone.id, clusterIds)
  }
  return zone
}
