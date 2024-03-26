import type { Cluster, Stage, User } from '@prisma/client'
import { UnauthorizedError } from '@/utils/errors.js'
import {
  getUserById,
  getStages as getStagesQuery,
  linkClusterToStages as linkClusterToStagesQuery,
  getAllStageIds,
} from '../queries-index.js'

export const getStages = async (userId: User['id']) => {
  const user = await getUserById(userId)
  if (!user) throw new UnauthorizedError('Vous n\'êtes pas connecté')
  return getStagesQuery()
}

export const linkClusterToStages = async (clusterId: Cluster['id'], stageIds: Stage['id'][], linkToAll: boolean = false) => {
  if (linkToAll === true) {
    stageIds = await getAllStageIds()
  }
  await linkClusterToStagesQuery(clusterId, stageIds)
}
