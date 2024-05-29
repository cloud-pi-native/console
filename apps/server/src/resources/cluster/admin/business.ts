import type { User } from '@prisma/client'
import { ClusterBusinessSchema, ClusterPrivacy, CreateClusterBusinessSchema, Project, UserProfile, type Cluster } from '@cpn-console/shared'
import { addLogs, createCluster as createClusterQuery, deleteCluster as deleteClusterQuery, getClusterById, getClusterByLabel, getClusterEnvironments, getClustersWithProjectIdAndConfig, getProjectsByClusterId, getStagesByClusterId, getUserById, linkClusterToProjects, linkZoneToClusters, removeClusterFromProject, removeClusterFromStage, updateCluster as updateClusterQuery } from '@/resources/queries-index.js'
import { linkClusterToStages } from '@/resources/stage/business.js'
import { validateSchema } from '@/utils/business.js'
import { BadRequestError, DsoError, NotFoundError, UnauthorizedError } from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'

export const checkClusterProjectIds = (data: Omit<Cluster, 'id'> & { id?: Cluster['id'] }) => {
  // si le cluster est dedicated, la clé projectIds doit être renseignée
  return data.privacy === ClusterPrivacy.PUBLIC || !data.projectIds
    ? []
    : data.projectIds
}

export const getAllClusters = async (kcUser: UserProfile) => {
  const user = await getUserById(kcUser.id)
  if (!user) throw new UnauthorizedError('Vous n\'êtes pas connecté')

  const clusters = await getClustersWithProjectIdAndConfig()
  return clusters.map(({ stages, ...cluster }) => ({
    ...cluster,
    user: cluster.kubeconfig.user,
    cluster: cluster.kubeconfig.cluster,
    projectIds: cluster.projects.map(({ id }) => id),
    stageIds: stages.map(({ id }) => id) ?? [],
  }))
}

export const getClusterAssociatedEnvironments = async (clusterId: string) => {
  try {
    const clusterEnvironments = (await getClusterEnvironments(clusterId))?.environments

    if (!clusterEnvironments) throw new NotFoundError('Aucun environnement associé à ce cluster')

    return clusterEnvironments.map(environment => {
      return ({
        organization: environment.project?.organization?.name,
        project: environment.project?.name,
        name: environment.name,
        owner: environment.project?.roles?.find(role => role?.role === 'owner')?.user?.email ?? 'Impossible de trouver le souscripteur',
      })
    })
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const createCluster = async (data: Omit<Cluster, 'id'>, userId: User['id'], requestId: string) => {
  try {
    const schemaValidation = CreateClusterBusinessSchema.safeParse(data)
    validateSchema(schemaValidation)

    const isLabelTaken = await getClusterByLabel(data.label)
    if (isLabelTaken) throw new BadRequestError('Ce label existe déjà pour un autre cluster', undefined)

    const {
      projectIds = [],
      stageIds,
      user,
      cluster,
      zoneId,
      ...clusterData
    } = data

    // @ts-ignore
    const clusterCreated = await createClusterQuery(clusterData, { user, cluster }, zoneId)

    if (data.privacy === ClusterPrivacy.DEDICATED && projectIds.length) {
      await linkClusterToProjects(clusterCreated.id, projectIds)
    }

    if (stageIds?.length) {
      await linkClusterToStages(clusterCreated.id, stageIds)
    }

    const results = await hook.cluster.upsert(clusterCreated.id)

    await addLogs('Create Cluster', results, userId, requestId)

    return clusterCreated
  } catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}

export const updateCluster = async (data: Partial<Cluster>, clusterId: Cluster['id'], userId: User['id'], requestId: string) => {
  try {
    if (data?.privacy === ClusterPrivacy.PUBLIC) delete data.projectIds

    const schemaValidation = ClusterBusinessSchema.safeParse({ ...data, id: clusterId })
    validateSchema(schemaValidation)

    const dbCluster = await getClusterById(clusterId)
    if (!dbCluster) throw new NotFoundError('Aucun cluster trouvé pour cet id')
    if (data?.label && data.label !== dbCluster.label) throw new BadRequestError('Le label d\'un cluster ne peut être modifié')

    const {
      projectIds,
      stageIds,
      user,
      cluster,
      zoneId,
      ...clusterData
    } = data

    // @ts-ignore
    const clusterUpdated = await updateClusterQuery(clusterId, clusterData, { user, cluster })

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

      const dbStages = await getStagesByClusterId(clusterId)
      if (dbStages) {
        for (const stage of dbStages) {
          if (!stageIds.includes(stage.id)) {
            await removeClusterFromStage(clusterUpdated.id, stage.id)
          }
        }
      }
    }

    const results = await hook.cluster.upsert(clusterId)

    await addLogs('Update Cluster', results, userId, requestId)

    return clusterUpdated
  } catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}

export const deleteCluster = async (clusterId: Cluster['id'], userId: User['id'], requestId: string) => {
  try {
    const environments = await getClusterAssociatedEnvironments(clusterId)
    if (environments?.length) throw new BadRequestError('Impossible de supprimer le cluster, des environnements en activité y sont déployés', { extras: environments })

    const cluster = await getClusterById(clusterId)
    if (!cluster) {
      throw new NotFoundError('Cluster introuvable')
    }
    const results = await hook.cluster.delete(cluster.id)

    await addLogs('Delete Cluster', results, userId, requestId)

    await deleteClusterQuery(clusterId)
  } catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}
