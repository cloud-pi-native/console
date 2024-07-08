import type { User } from '@prisma/client'
import { ClusterDetails, ClusterDetailsSchema, ClusterPrivacy, Kubeconfig, Project, type Cluster } from '@cpn-console/shared'
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
} from '@/resources/queries-index.js'
import { linkClusterToStages } from '@/resources/stage/business.js'
import { validateSchema } from '@/utils/business.js'
import { BadRequestError, DsoError, NotFoundError, UnprocessableContentError } from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'

export const checkClusterProjectIds = (data: Omit<ClusterDetails, 'id'> & { id?: Cluster['id'] }) => {
  // si le cluster est dedicated, la clé projectIds doit être renseignée
  return data.privacy === ClusterPrivacy.PUBLIC || !data.projectIds
    ? []
    : data.projectIds
}

export const getClusterAssociatedEnvironments = async (clusterId: string) => {
  try {
    const clusterEnvironments = await getClusterEnvironments(clusterId)

    return clusterEnvironments.map(environment => {
      return ({
        organization: environment.project?.organization?.name,
        project: environment.project?.name,
        name: environment.name,
        owner: environment.project.roles.find(role => role?.role === 'owner')?.user.email ?? 'Impossible de trouver le souscripteur',
      })
    })
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const getClusterDetails = async (clusterId: string): Promise<ClusterDetails> => {
  try {
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
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const createCluster = async (data: Omit<ClusterDetails, 'id'>, userId: User['id'], requestId: string) => {
  try {
    const isLabelTaken = await getClusterByLabel(data.label)
    if (isLabelTaken) throw new BadRequestError('Ce label existe déjà pour un autre cluster', undefined)

    const {
      projectIds = [],
      stageIds,
      kubeconfig,
      zoneId,
      ...clusterData
    } = data

    // @ts-ignore
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
      throw new UnprocessableContentError('Echec des services à la création du cluster')
    }

    return getClusterDetails(clusterCreated.id)
  } catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}

export const updateCluster = async (data: Partial<ClusterDetails>, clusterId: Cluster['id'], userId: User['id'], requestId: string) => {
  try {
    if (data?.privacy === ClusterPrivacy.PUBLIC) delete data.projectIds

    const schemaValidation = ClusterDetailsSchema.partial().safeParse({ ...data, id: clusterId })
    validateSchema(schemaValidation)

    const dbCluster = await getClusterById(clusterId)
    if (!dbCluster) throw new NotFoundError('Aucun cluster trouvé pour cet id')
    if (data?.label && data.label !== dbCluster.label) throw new BadRequestError('Le label d\'un cluster ne peut être modifié')

    const {
      projectIds,
      stageIds,
      kubeconfig,
      zoneId,
      ...clusterData
    } = data

    // @ts-ignore
    const clusterUpdated = await updateClusterQuery(clusterId, clusterData, kubeconfig)

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
      throw new UnprocessableContentError('Echec des services à la mise à jour du cluster')
    }

    return getClusterDetails(clusterId)
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

    const hookReply = await hook.cluster.delete(cluster.id)
    await addLogs('Delete Cluster', hookReply, userId, requestId)
    if (hookReply.failed) {
      throw new UnprocessableContentError('Echec des services à la supression du cluster')
    }

    await deleteClusterQuery(clusterId)
  } catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}
