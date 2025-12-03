import type { Cluster, Stage } from '@prisma/client'
import type { CreateStageBody, UpdateStageBody } from '@cpn-console/shared'
import {
  createStage as createStageQuery,
  deleteStage as deleteStageQuery,
  getAllStageIds,
  getStageAssociatedEnvironmentById,
  getStageById,
  getStageByName,
  linkClusterToStages as linkClusterToStagesQuery,
  linkStageToClusters,
  listStages as listStagesQuery,
  removeClusterFromStage,
  updateStageName,
} from '@old-server/resources/queries-index.js'
import { BadRequest400, NotFound404 } from '@old-server/utils/errors.js'
import prisma from '@old-server/prisma.js'

export async function getStageAssociatedEnvironments(stageId: Stage['id']) {
  const environments = await getStageAssociatedEnvironmentById(stageId)
  return environments.map(env => ({
    project: env.project.slug,
    name: env.name,
    cluster: env.cluster.label,
    owner: env.project.owner.email,
  }))
}

export async function createStage({ clusterIds = [], name }: CreateStageBody) {
  const isNameTaken = await getStageByName(name)
  if (isNameTaken) return new BadRequest400('Un type d\'environnement portant ce nom existe déjà')

  const stage = await createStageQuery({ name })

  if (clusterIds.length) {
    await linkStageToClusters(stage.id, clusterIds)
  }

  return {
    id: stage.id,
    name: stage.name,
    clusterIds,
  }
}

export async function updateStage(stageId: Stage['id'], { clusterIds, name }: UpdateStageBody) {
  const dbStage = await getStageById(stageId)
  if (!dbStage) return new NotFound404()
  if (name !== dbStage.name) {
    await updateStageName(stageId, name)
  }
  // Remove clusters
  const dbClusters = dbStage.clusters
  if (dbClusters?.length) {
    const clustersToRemove = dbClusters.filter(dbCluster => !clusterIds.includes(dbCluster.id))
    for (const clusterToRemove of clustersToRemove) {
      await removeClusterFromStage(clusterToRemove.id, stageId)
    }
  }
  // Add clusters
  if (clusterIds.length) {
    await linkStageToClusters(stageId, clusterIds)
  }

  return {
    id: stageId,
    name: name ?? dbStage.name,
    clusterIds: clusterIds ?? dbStage.clusters.map(({ id }) => id),
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
