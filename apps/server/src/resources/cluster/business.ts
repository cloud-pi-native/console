import { type Prisma, User } from '@prisma/client'
import { type ClusterDetails, ClusterDetailsSchema, ClusterPrivacy, Kubeconfig, Project, type Cluster } from '@cpn-console/shared'
import {
  addLogs,
  createCluster as createClusterQuery,
  deleteCluster as deleteClusterQuery,
  getClusterById,
  getClusterByLabel,
  getClusterEnvironments,
  getProjectsByClusterId,
  listStagesByClusterId,
  linkClusterToProjects,
  linkZoneToClusters,
  removeClusterFromProject,
  removeClusterFromStage,
  updateCluster as updateClusterQuery,
  getClusterDetails as getClusterDetailsQuery,
  listClusters as listClustersQuery,
} from '@/resources/queries-index.js'
import { linkClusterToStages } from '@/resources/stage/business.js'
import { validateSchema } from '@/utils/business.js'
import { hook } from '@/utils/hook-wrapper.js'
import { ErrorResType, BadRequest400, NotFound404, Unprocessable422 } from '@/utils/errors.js'

export const listClusters = async (userId?: User['id']) => {
  const where: Prisma.ClusterWhereInput = userId
    ? {
        OR: [
        // Sélectionne tous les clusters publics
          { privacy: 'public' },
          // Sélectionne les clusters associés aux projets dont l'user est membre
          {
            projects: { some: { members: { some: { userId } } } },
          },
          // Sélectionne les clusters associés aux environnments appartenant à des projets dont l'user est membre
          {
            environments: { some: { project: { members: { some: { userId } } } } },
          },
        ],
      }
    : {}
  const clusters = await listClustersQuery(where)
  return clusters.map(({ stages, ...cluster }) => ({
    ...cluster,
    stageIds: stages?.map(({ id }) => id) ?? [],
  }))
}

export const getClusterAssociatedEnvironments = async (clusterId: string) => {
  const clusterEnvironments = await getClusterEnvironments(clusterId)

  return clusterEnvironments.map((environment) => {
    return ({
      organization: environment.project?.organization?.name,
      project: environment.project?.name,
      name: environment.name,
      owner: environment.project.owner.email,
    })
  })
}

export const getClusterDetails = async (clusterId: string): Promise<ClusterDetails> => {
  const { infos, projects, stages, kubeconfig, ...details } = await getClusterDetailsQuery(clusterId)

  return {
    ...details,
    infos: infos ?? '',
    projectIds: projects.map(project => project.id),
    stageIds: stages.map(({ id }) => id),
    kubeconfig: {
      cluster: kubeconfig.cluster as unknown as Kubeconfig['cluster'],
      user: kubeconfig.user as unknown as Kubeconfig['user'],
    },
  }
}

export const createCluster = async (data: Omit<ClusterDetails, 'id'>, userId: User['id'], requestId: string) => {
  const isLabelTaken = await getClusterByLabel(data.label)
  if (isLabelTaken) return new BadRequest400('Ce label existe déjà pour un autre cluster')

  data.projectIds = data.privacy === ClusterPrivacy.PUBLIC
    ? []
    : data.projectIds ?? []

  const {
    projectIds,
    stageIds,
    kubeconfig,
    zoneId,
    ...clusterData
  } = data

  const clusterCreated = await createClusterQuery(clusterData, kubeconfig, zoneId)

  if (data.privacy === ClusterPrivacy.DEDICATED && projectIds.length) {
    await linkClusterToProjects(clusterCreated.id, projectIds)
  }

  if (stageIds?.length) {
    await linkClusterToStages(clusterCreated.id, stageIds)
  }

  const hookReply = await hook.cluster.upsert(clusterCreated.id)
  await addLogs('Create Cluster', hookReply, userId, requestId)
  if (hookReply.failed) {
    return new Unprocessable422('Echec des services à la création du cluster')
  }

  return getClusterDetails(clusterCreated.id)
}

export const updateCluster = async (data: Partial<ClusterDetails>, clusterId: Cluster['id'], userId: User['id'], requestId: string): Promise<ClusterDetails | ErrorResType> => {
  if (data?.privacy === ClusterPrivacy.PUBLIC) delete data.projectIds

  const schemaValidation = ClusterDetailsSchema.partial().safeParse({ ...data, id: clusterId })
  const validateResult = validateSchema(schemaValidation)
  if (validateResult instanceof ErrorResType) return validateResult

  const dbCluster = await getClusterById(clusterId)
  if (!dbCluster) return new NotFound404()
  if (data?.label && data.label !== dbCluster.label) return new BadRequest400('Le label d\'un cluster ne peut être modifié')

  const {
    projectIds,
    stageIds,
    kubeconfig,
    zoneId,
    ...clusterData
  } = data

  const clusterUpdated = await updateClusterQuery(clusterId,
    clusterData,
    // @ts-ignore
    kubeconfig,
  )

  // zone
  if (zoneId) {
    await linkZoneToClusters(zoneId, [clusterId])
  }

  // projects
  const dbProjects = await getProjectsByClusterId(clusterId)

  let projectsToRemove: Project['id'][] = []

  if (projectIds && clusterUpdated.privacy === ClusterPrivacy.DEDICATED) {
    await linkClusterToProjects(clusterId, projectIds)
    projectsToRemove = dbProjects?.map(project => project.id)?.filter(dbProjectId => !projectIds.includes(dbProjectId)) ?? []
  } else if (clusterUpdated.privacy === ClusterPrivacy.PUBLIC) {
    projectsToRemove = dbProjects?.map(project => project.id) ?? []
  }

  for (const projectId of projectsToRemove) {
    await removeClusterFromProject(clusterUpdated.id, projectId)
  }

  // stages
  if (stageIds) {
    await linkClusterToStages(clusterId, stageIds)

    const dbStages = await listStagesByClusterId(clusterId)
    if (dbStages) {
      for (const stage of dbStages) {
        if (!stageIds.includes(stage.id)) {
          await removeClusterFromStage(clusterUpdated.id, stage.id)
        }
      }
    }
  }

  const hookReply = await hook.cluster.upsert(clusterId)
  await addLogs('Update Cluster', hookReply, userId, requestId)
  if (hookReply.failed) {
    return new Unprocessable422('Echec des services à la mise à jour du cluster')
  }

  return getClusterDetails(clusterId)
}

export const deleteCluster = async (clusterId: Cluster['id'], userId: User['id'], requestId: string) => {
  const environments = await getClusterAssociatedEnvironments(clusterId)
  if (environments?.length) return new BadRequest400('Impossible de supprimer le cluster, des environnements en activité y sont déployés')

  const cluster = await getClusterById(clusterId)
  if (!cluster) {
    return new NotFound404()
  }
  const hookReply = await hook.cluster.delete(cluster.id)
  await addLogs('Delete Cluster', hookReply, userId, requestId)
  if (hookReply.failed) {
    return new Unprocessable422('Echec des services à la suppression du cluster')
  }

  await deleteClusterQuery(clusterId)
  return null
}
