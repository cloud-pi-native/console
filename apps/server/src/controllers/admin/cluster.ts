import { type CreateClusterDto, type UpdateClusterDto, clusterSchema } from 'shared'
import {
  addClusterToProjectWithIds,
  addLogs,
  createCluster,
  getClusterById,
  getClusterByLabel,
  getClustersWithProjectId,
  getProjectsByClusterId,
  removeClusterFromProject,
  updateCluster,
} from '@/queries/index.js'
import { hooks } from '@/plugins/index.js'
import { EnhancedFastifyRequest } from '@/types/index.js'
import { addReqLogs } from '@/utils/logger.js'
import { sendBadRequest, sendCreated, sendNotFound, sendOk } from '@/utils/response.js'
import type { AsyncReturnType } from '@/utils/controller'

// GET
export const getAllClustersController = async (req, res) => {
  try {
    const clusters = await getClustersWithProjectId()

    const cleanedClusters = clusters.map(cluster => {
      const newCluster = {
        ...cluster,
        projectsId: cluster.projects.map(({ id }) => id),
      }
      delete newCluster.projects
      return newCluster
    })

    addReqLogs({
      req,
      description: 'Clusters récupérés avec succès',
    })
    sendOk(res, cleanedClusters)
  } catch (error) {
    const description = 'Echec de la récupération des clusters'
    addReqLogs({
      req,
      description,
      error,
    })
    sendNotFound(res, description)
  }
}

// POST
export const createClusterController = async (req: EnhancedFastifyRequest<CreateClusterDto>, res) => {
  const data = req.body
  const userId = req.session?.user?.id
  data.projectsId = data.projectsId === undefined ? [] : data.projectsId

  let cluster: AsyncReturnType<typeof createCluster>
  try {
    await clusterSchema.validateAsync(data, { presence: 'required' })

    const isLabelTaken = await getClusterByLabel(data.label)
    if (isLabelTaken) throw new Error('Ce label existe déjà pour un autre cluster')

    // TODO check if secretName is available with validation plugins
    const clusterData = structuredClone(data)
    delete clusterData.projectsId
    cluster = await createCluster(clusterData)

    for (const projectId of data.projectsId) {
      await addClusterToProjectWithIds(cluster.id, projectId)
    }

    addReqLogs({
      req,
      description: 'Cluster créé avec succès',
      extras: {
        clusterId: cluster.id,
      },
    })
    sendCreated(res, cluster)
  } catch (error) {
    const description = 'Echec à la création du cluster en base de données'
    addReqLogs({
      req,
      description,
      error,
    })
    sendBadRequest(res, description)
  }

  try {
    // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
    const results = await hooks.createCluster.execute(cluster)
    // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
    await addLogs('Create Cluster', results, userId)

    const description = 'Cluster créé par les plugins avec succès'
    addReqLogs({
      req,
      description,
    })
  } catch (error) {
    const description = 'Problème à la création du cluster par les plugins'
    addReqLogs({
      req,
      description,
      error,
    })
  }
}

// PUT
export const updateClusterController = async (req:EnhancedFastifyRequest<UpdateClusterDto>, res) => {
  const data = req.body
  const clusterId = req.params?.clusterId

  let cluster: AsyncReturnType<typeof updateCluster>
  try {
    await clusterSchema.validateAsync(data, { presence: 'optional' })
    const dbCluster = await getClusterById(clusterId)
    const dbProjects = await getProjectsByClusterId(clusterId)

    if (!dbCluster) throw new Error('Aucun cluster trouvé pour cet id')
    if (data?.label && data.label !== dbCluster.label) throw new Error('Le label d\'un cluster ne peut être modifié')
    const clusterData = structuredClone(data)
    delete clusterData.projectsId
    cluster = await updateCluster(clusterId, clusterData)

    if (data.projectsId) {
      for (const projectId of data.projectsId) {
        await addClusterToProjectWithIds(clusterId, projectId)
      }

      // TODO : remove cluster
      // Qu'est-ce que je fais ici ... ?
      for (const project of dbProjects) {
        if (!data.projectsId.includes(project.id)) {
          await removeClusterFromProject(cluster.id, project.id)
        }
      }
    }

    addReqLogs({
      req,
      description: 'Cluster mis à jour avec succès',
      extras: {
        clusterId: cluster.id,
      },
    })
    sendCreated(res, cluster)
  } catch (error) {
    const description = 'Echec de la mise à jour du cluster'
    addReqLogs({
      req,
      description,
      extras: {
        clusterId: cluster?.id,
      },
      error,
    })
    sendBadRequest(res, description)
  }
}
