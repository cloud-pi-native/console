import { linkClusterToProjects, addLogs, createCluster as createClusterQuery, getClusterById, getClusterByLabel, getClustersWithProjectIdAndConfig, getProjectsByClusterId, getStagesByClusterId, removeClusterFromProject, removeClusterFromStage, updateCluster as updateClusterQuery } from '@/resources/queries-index.js'
import { BadRequestError, NotFoundError } from '@/utils/errors.js'
import { hooks } from '@/plugins/index.js'
import { CreateClusterDto, UpdateClusterDto, clusterSchema, exclude } from '@dso-console/shared'
import { User } from '@prisma/client'
import { linkClusterToStages } from '@/resources/stage/business.js'

export const getAllCleanedClusters = async () => {
  const clusters = await getClustersWithProjectIdAndConfig()

  const cleanedClusters = clusters.map(cluster => {
    const newCluster = exclude({
      ...cluster,
      user: cluster.kubeconfig.user,
      cluster: cluster.kubeconfig.cluster,
      projectIds: cluster.projects.filter(project => project.status !== 'archived').map(({ id }) => id),
      stageIds: cluster.stages.map(({ id }) => id) ?? [],
    },
    ['projects', 'stages', 'kubeconfig'])
    return newCluster
  })

  return cleanedClusters
}

export const checkClusterProjectIds = (data: CreateClusterDto['body']) => {
  // si le cluster est dedicated, la clé projectIds doit être renseignée
  return data.privacy === 'public' || !data.projectIds
    ? []
    : data.projectIds
}

export const createCluster = async (data: CreateClusterDto['body'], userId: User['id']) => {
  await clusterSchema.validateAsync(data, { presence: 'required' })

  const isLabelTaken = await getClusterByLabel(data.label)
  if (isLabelTaken) throw new BadRequestError('Ce label existe déjà pour un autre cluster', undefined)

  // TODO check if secretName is available with validation plugins
  const kubeConfig = {
    user: data.user,
    cluster: data.cluster,
  }
  const clusterData = exclude(structuredClone(data), ['projectIds', 'stageIds', 'user', 'cluster'])
  const cluster = await createClusterQuery(clusterData, kubeConfig)

  await linkClusterToProjects(cluster.id, data.projectIds)

  await linkClusterToStages(cluster.id, data.stageIds)

  const results = await hooks.createCluster.execute({ ...cluster, user: data.user, cluster: data.cluster })
  // @ts-ignore
  await addLogs('Create Cluster', results, userId)

  return cluster
}

export const updateCluster = async (data: UpdateClusterDto['body'], clusterId: UpdateClusterDto['body']['id']) => {
  if (data?.privacy === 'public') delete data.projectIds

  await clusterSchema.validateAsync(data, { presence: 'optional' })
  const dbCluster = await getClusterById(clusterId)
  if (!dbCluster) throw new NotFoundError('Aucun cluster trouvé pour cet id')
  if (data?.label && data.label !== dbCluster.label) throw new BadRequestError('Le label d\'un cluster ne peut être modifié')

  const kubeConfig = {
    user: data.user,
    cluster: data.cluster,
  }
  const clusterData = exclude(structuredClone(data), ['projectIds', 'stageIds', 'user', 'cluster'])
  const cluster = await updateClusterQuery(clusterId, clusterData, kubeConfig)

  await hooks.updateCluster.execute({ ...cluster, user: { ...kubeConfig.user }, cluster: { ...kubeConfig.cluster } })

  if (data.projectIds) {
    await linkClusterToProjects(clusterId, data.projectIds)

    const dbProjects = await getProjectsByClusterId(clusterId)
    for (const project of dbProjects) {
      if (!data.projectIds.includes(project.id)) {
        await removeClusterFromProject(cluster.id, project.id)
      }
    }
  }

  if (data.stageIds) {
    await linkClusterToStages(clusterId, data.stageIds)

    const dbStages = await getStagesByClusterId(clusterId)
    for (const stage of dbStages) {
      if (!data.stageIds.includes(stage.id)) {
        await removeClusterFromStage(cluster.id, stage.id)
      }
    }
  }

  return cluster
}
