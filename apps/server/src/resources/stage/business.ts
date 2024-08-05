import type { Stage, Cluster } from '@prisma/client'
import { type CreateStageBody, UpdateStageBody } from '@cpn-console/shared'
import {
  getStageByName,
  createStage as createStageQuery,
  deleteStage as deleteStageQuery,
  getStageById,
  linkStageToClusters,
  removeClusterFromStage,
  linkStageToQuotas,
  getStageAssociatedEnvironmentById,
  updateStageName,
  unlinkStageFromQuotas,
} from '@/resources/queries-index.js'
import {
  listStages as listStagesQuery,
  linkClusterToStages as linkClusterToStagesQuery,
  getAllStageIds,
} from '../queries-index.js'
import { BadRequest400, NotFound404 } from '@/utils/controller.js'
import prisma from '@/prisma.js'

export const getStageAssociatedEnvironments = async (stageId: Stage['id']) => {
  const stage = await getStageById(stageId)
  if (!stage) return new BadRequest400(`Le stage ${stageId} n'existe pas`)
  const environments = await getStageAssociatedEnvironmentById(stageId)
  return environments.map(env => ({
    organization: env.project.organization.name,
    project: env.project.name,
    name: env.name,
    quota: env.quota.name,
    cluster: env.cluster.label,
    owner: env.project.owner.email,
  }))
}

export const createStage = async ({ clusterIds = [], name, quotaIds = [] }: CreateStageBody) => {
  const isNameTaken = await getStageByName(name)
  if (isNameTaken) return new BadRequest400('Un type d\'environnement portant ce nom existe déjà')

  const stage = await createStageQuery({ name })

  if (quotaIds.length) {
    await linkStageToQuotas(stage.id, quotaIds)
  }

  if (clusterIds.length) {
    await linkStageToClusters(stage.id, clusterIds)
  }

  return {
    id: stage.id,
    name: stage.name,
    clusterIds,
    quotaIds,
  }
}

export const updateStage = async (stageId: Stage['id'], { clusterIds, name, quotaIds }: UpdateStageBody) => {
  const dbStage = await getStageById(stageId)
  if (!dbStage) return new NotFound404()
  if (name === dbStage.name) {
    await updateStageName(stageId, name)
  }
  // Remove clusters
  if (clusterIds) {
    const dbClusters = dbStage.clusters
    if (dbClusters?.length) {
      const clustersToRemove = dbClusters.filter(dbCluster => !clusterIds.includes(dbCluster.id))
      for (const clusterToRemove of clustersToRemove) {
        await removeClusterFromStage(clusterToRemove.id, stageId)
      }
    }
    // Add clusters
    await linkStageToClusters(stageId, clusterIds)
  }

  if (quotaIds) {
    const dbQuotas = dbStage.quotas
    const quotaIdsToRemove = dbQuotas
      .filter(({ id }) => !quotaIds.includes(id))
      .map(({ id }) => id)

    if (quotaIdsToRemove.length) {
      await unlinkStageFromQuotas(stageId, quotaIdsToRemove)
    }
    const quotaIdsToAdd = quotaIds
      .filter(quotaIdToAdd => !dbQuotas.find(({ id }) => id === quotaIdToAdd))
    if (quotaIdsToAdd.length) {
      await linkStageToQuotas(stageId, quotaIdsToAdd)
    }
  }

  return {
    id: stageId,
    name: name ?? dbStage.name,
    clusterIds: clusterIds ?? dbStage.clusters.map(({ id }) => id),
    quotaIds: quotaIds ?? dbStage.quotas.map(({ id }) => id),
  }
}

export const deleteStage = async (stageId: Stage['id']) => {
  const attachedEnvironment = await prisma.environment.findFirst({ where: { stageId }, select: { id: true } })
  if (attachedEnvironment) return new BadRequest400('Impossible de supprimer le stage, des environnements en activité y ont souscrit')

  await deleteStageQuery(stageId)
  return null
}

export const listStages = async () => {
  const stages = await listStagesQuery()

  return stages.map((stage) => {
    return {
      id: stage.id,
      name: stage.name,
      quotaIds: stage.quotas.map(({ id }) => id),
      clusterIds: stage.clusters.map(({ id }) => id),
    }
  })
}

export const linkClusterToStages = async (clusterId: Cluster['id'], stageIds: Stage['id'][], linkToAll: boolean = false) => {
  if (linkToAll === true) {
    stageIds = await getAllStageIds()
  }
  await linkClusterToStagesQuery(clusterId, stageIds)
}
