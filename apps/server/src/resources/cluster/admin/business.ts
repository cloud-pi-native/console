import { linkClusterToProjects, addLogs, createCluster as createClusterQuery, getClusterById, getClusterByLabel, getProjectsByClusterId, getStagesByClusterId, removeClusterFromProject, removeClusterFromStage, updateCluster as updateClusterQuery, getClusterEnvironments, deleteCluster as deleteClusterQuery } from '@/resources/queries-index.js'
import { BadRequestError, DsoError, NotFoundError } from '@/utils/errors.js'
import type { Cluster, Log, User } from '@prisma/client'
import { hooks } from '@cpn-console/hooks'
import { type CreateClusterDto, updateClusterSchema, CreateClusterBusinessSchema, ClusterBusinessSchema, ClusterPrivacy } from '@cpn-console/shared'
import { linkClusterToStages } from '@/resources/stage/business.js'
import { FromSchema } from 'json-schema-to-ts'
import { validateSchema } from '@/utils/business.js'

export const checkClusterProjectIds = (data: CreateClusterDto) => {
  // si le cluster est dedicated, la clé projectIds doit être renseignée
  return data.privacy === ClusterPrivacy.PUBLIC || !data.projectIds
    ? []
    : data.projectIds
}

export const getClusterAssociatedEnvironments = async (clusterId: string) => {
  try {
    const clusterEnvironments = (await getClusterEnvironments(clusterId))?.environments

    const environments = clusterEnvironments?.map(environment => {
      return ({
        organization: environment?.project?.organization?.name,
        project: environment?.project?.name,
        name: environment?.name,
        owner: environment?.project?.roles?.find(role => role?.role === 'owner')?.user?.email,
      })
    })

    return environments
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const createCluster = async (data: CreateClusterDto, userId: User['id'], requestId: Log['requestId']) => {
  try {
    const schemaValidation = CreateClusterBusinessSchema.safeParse(data)
    validateSchema(schemaValidation)

    const isLabelTaken = await getClusterByLabel(data.label)
    if (isLabelTaken) throw new BadRequestError('Ce label existe déjà pour un autre cluster', undefined)

    const {
      projectIds,
      stageIds,
      user,
      cluster,
      ...clusterData
    } = data

    // @ts-ignore
    const clusterCreated = await createClusterQuery(clusterData, { user, cluster })

    if (data.privacy === ClusterPrivacy.DEDICATED) {
      await linkClusterToProjects(clusterCreated.id, projectIds)
    }

    await linkClusterToStages(clusterCreated.id, stageIds)

    // @ts-ignore
    const results = await hooks.createCluster.execute({ ...clusterCreated, user, cluster })
    // @ts-ignore
    await addLogs('Create Cluster', results, userId, requestId)

    return clusterCreated
  } catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}

export const updateCluster = async (data: FromSchema<typeof updateClusterSchema['body']>, clusterId: Cluster['id'], userId: User['id'], requestId: Log['requestId']) => {
  try {
    if (data?.privacy === ClusterPrivacy.PUBLIC) delete data.projectIds

    const schemaValidation = ClusterBusinessSchema.safeParse({ ...data, id: clusterId })
    validateSchema(schemaValidation)

    const dbCluster = await getClusterById(clusterId)
    if (!dbCluster) throw new NotFoundError('Aucun cluster trouvé pour cet id')
    if (data?.label && data.label !== dbCluster.label) throw new BadRequestError('Le label d\'un cluster ne peut être modifié')

    const kubeConfig = {
      user: data.user,
      cluster: data.cluster,
    }
    const {
      projectIds,
      stageIds,
      user,
      cluster,
      ...clusterData
    } = data

    // @ts-ignore
    const clusterUpdated = await updateClusterQuery(clusterId, clusterData, { user, cluster })

    // @ts-ignore
    const results = await hooks.updateCluster.execute({ ...cluster, user: { ...kubeConfig.user }, cluster: { ...kubeConfig.cluster } })

    // @ts-ignore
    await addLogs('Update Cluster', results, userId, requestId)

    if (projectIds || data.privacy === ClusterPrivacy.PUBLIC) {
      const dbProjects = await getProjectsByClusterId(clusterId)

      if (projectIds) {
        await linkClusterToProjects(clusterId, projectIds)
      }

      for (const project of dbProjects) {
        if (!projectIds?.includes(project.id)) {
          await removeClusterFromProject(clusterUpdated.id, project.id)
        }
      }

      if (stageIds) {
        await linkClusterToStages(clusterId, stageIds)

        const dbStages = await getStagesByClusterId(clusterId)
        for (const stage of dbStages) {
          if (!stageIds.includes(stage.id)) {
            await removeClusterFromStage(clusterUpdated.id, stage.id)
          }
        }
      }
    }
    return clusterUpdated
  } catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}

export const deleteCluster = async (clusterId: Cluster['id'], userId: User['id'], requestId: Log['requestId']) => {
  try {
    const environments = await getClusterAssociatedEnvironments(clusterId)
    if (environments?.length) throw new BadRequestError('Impossible de supprimer le cluster, des environnements en activité y sont déployés', { extras: environments })

    const cluster = await getClusterById(clusterId)

    const results = await hooks.deleteCluster.execute({ secretName: cluster.secretName })
    // @ts-ignore
    await addLogs('Delete Cluster', results, userId, requestId)

    await deleteClusterQuery(clusterId)
  } catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}
