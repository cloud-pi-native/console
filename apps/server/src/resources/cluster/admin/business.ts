import { addClusterToProjectWithIds, addLogs, createCluster, getClusterById, getClusterByLabel, getClustersWithProjectIdAndConfig, getProjectsByClusterId, removeClusterFromProject, updateCluster } from '@/resources/queries-index.js'
import { BadRequestError, NotFoundError } from '@/utils/errors.js'
import { hooks } from '@/plugins/index.js'
import { CreateClusterDto, UpdateClusterDto, clusterSchema } from 'shared'
import { User } from '@prisma/client'

export const getAllCleanedClusters = async () => {
  const clusters = await getClustersWithProjectIdAndConfig()

  const cleanedClusters = clusters.map(cluster => {
    const newCluster = {
      ...cluster,
      user: cluster.kubeconfig.user,
      cluster: cluster.kubeconfig.cluster,
      projectsId: cluster.projects.filter(project => project.status !== 'archived').map(({ id }) => id),
    }
    delete newCluster.projects
    delete newCluster.kubeconfig
    return newCluster
  })

  return cleanedClusters
}

export const checkClusterProjectsId = (data: CreateClusterDto['body']) => {
  // si le cluster est dedicated, la clé projectsId doit être renseignée
  return data.privacy === 'public' || !data.projectsId
    ? []
    : data.projectsId
}

export const createClusterBusiness = async (data: CreateClusterDto['body'], userId: User['id']) => {
  await clusterSchema.validateAsync(data, { presence: 'required' })

  const isLabelTaken = await getClusterByLabel(data.label)
  if (isLabelTaken) throw new BadRequestError('Ce label existe déjà pour un autre cluster', undefined)

  // TODO check if secretName is available with validation plugins
  const clusterData = structuredClone(data)
  const kubeConfig = {
    user: clusterData.user,
    cluster: clusterData.cluster,
  }
  delete clusterData.projectsId
  delete clusterData.user
  delete clusterData.cluster
  const cluster = await createCluster(clusterData, kubeConfig)

  for (const projectId of data.projectsId) {
    await addClusterToProjectWithIds(cluster.id, projectId)
  }

  const results = await hooks.createCluster.execute({ ...cluster, user: data.user, cluster: data.cluster })
  await addLogs('Create Cluster', results, userId)

  return cluster
}

export const updateClusterBusiness = async (data: UpdateClusterDto['body'], clusterId: UpdateClusterDto['body']['id']) => {
  if (data?.privacy === 'public') delete data.projectsId

  await clusterSchema.validateAsync(data, { presence: 'optional' })
  const dbCluster = await getClusterById(clusterId)
  const dbProjects = await getProjectsByClusterId(clusterId)

  if (!dbCluster) throw new Error('Aucun cluster trouvé pour cet id')
  if (data?.label && data.label !== dbCluster.label) throw new Error('Le label d\'un cluster ne peut être modifié')
  const clusterData = structuredClone(data)
  const kubeConfig = {
    user: clusterData.user,
    cluster: clusterData.cluster,
  }
  delete clusterData.projectsId
  delete clusterData.user
  delete clusterData.cluster
  const cluster = await updateCluster(clusterId, clusterData, kubeConfig)

  if (data.projectsId) {
    for (const projectId of data.projectsId) {
      await addClusterToProjectWithIds(clusterId, projectId)
    }
    for (const project of dbProjects) {
      if (!data.projectsId.includes(project.id)) {
        await removeClusterFromProject(cluster.id, project.id)
      }
    }
  }

  return cluster
}
