import { BadRequestError, ForbiddenError } from '@/utils/errors.js'
import {
  createZone as createZoneQuery,
  updateZone as updateZoneQuery,
  deleteZone as deleteZoneQuery,
  linkZoneToClusters,
  getZoneById,
  getZoneBySlug,
} from './queries.js'
import { Zone } from '@prisma/client'
import { bindZoneAndClusterIds } from '../business.js'

type CreateZoneParam = {
  slug: string
  label: string
  description: string | null
  clusterIds?: string[]
}
export const createZone = async (data: CreateZoneParam) => {
  const { slug, label, description, clusterIds } = data

  const existingZone = await getZoneBySlug(slug)
  if (existingZone) throw new BadRequestError(`Une zone portant le nom ${slug} existe déjà.`)
  const zone = await createZoneQuery({ slug, label, description })
  if (clusterIds) {
    await linkZoneToClusters(zone.id, clusterIds)
  }

  return { ...zone, clusterIds: clusterIds ?? [] }
}

export const updateZone = async (zoneId: Zone['id'], data: Pick<CreateZoneParam, 'label' | 'description'>) => {
  const { label, description } = data

  const zone = await updateZoneQuery(zoneId, { label, description })
  return bindZoneAndClusterIds(zone)
}

export const deleteZone = async (zoneId: Zone['id']) => {
  const zone = await getZoneById(zoneId)
  if (zone?.clusters?.length) throw new ForbiddenError('Vous ne pouvez supprimer cette zone, car des clusters y sont associés.')

  await deleteZoneQuery(zoneId)
}
