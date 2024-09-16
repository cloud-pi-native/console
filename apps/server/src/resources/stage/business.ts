import type { CreateStageBody, UpdateStageBody } from '@cpn-console/shared'
import type { Cluster, Stage } from '@prisma/client'
import prisma from '@/prisma.js'
import {
  createStage as createStageQuery,
  deleteStage as deleteStageQuery,
  getAllStageIds,
  getStageAssociatedEnvironmentById,
  getStageById,
  getStageByName,
  linkClusterToStages as linkClusterToStagesQuery,
  linkStageToClusters,
  linkStageToQuotas,
  listStages as listStagesQuery,
  removeClusterFromStage,
  unlinkStageFromQuotas,
  updateStageName,
} from '@/resources/queries-index.js'
import { BadRequest400, NotFound404 } from '@/utils/errors.js'

export async function getStageAssociatedEnvironments(stageId: Stage['id']) {
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

export async function createStage({ clusterIds = [], name, quotaIds = [] }: CreateStageBody) {
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

export async function updateStage(stageId: Stage['id'], { clusterIds, name, quotaIds }: UpdateStageBody) {
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

export async function deleteStage(stageId: Stage['id']) {
  const attachedEnvironment = await prisma.environment.findFirst({ where: { stageId }, select: { id: true } })
  if (attachedEnvironment) return new BadRequest400('Impossible de supprimer le stage, des environnements en activité y ont souscrit')

  await deleteStageQuery(stageId)
  return null
}

export async function listStages() {
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

export async function linkClusterToStages(clusterId: Cluster['id'], stageIds: Stage['id'][], linkToAll: boolean = false) {
  if (linkToAll === true) {
    stageIds = await getAllStageIds()
  }
  await linkClusterToStagesQuery(clusterId, stageIds)
}
