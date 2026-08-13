import type { Prisma } from '@prisma/client'

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
