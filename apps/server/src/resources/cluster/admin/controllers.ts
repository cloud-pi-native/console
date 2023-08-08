import { type CreateClusterDto, type UpdateClusterDto, clusterSchema } from 'shared'
import {
  addClusterToProjectWithIds,
  addLogs,
  createCluster,
  getClusterById,
  getClusterByLabel,
  getClustersWithProjectIdAndConfig,
  getProjectsByClusterId,
  removeClusterFromProject,
  updateCluster,
} from '@/resources/queries-index.js'
import { hooks } from '@/plugins/index.js'
import { EnhancedFastifyRequest } from '@/types/index.js'
import { addReqLogs } from '@/utils/logger.js'
import { sendBadRequest, sendCreated, sendNotFound, sendOk } from '@/utils/response.js'
import type { AsyncReturnType } from '@/utils/controller'

// GET
export const getAllClustersController = async (req, res) => {
  try {
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
  // si le cluster est dedicated on s'assure que la clé projectsId bien renseigné
  data.projectsId = data.privacy === 'public' || !data.projectsId
    ? []
    : data.projectsId

  let cluster: AsyncReturnType<typeof createCluster>
  try {
    await clusterSchema.validateAsync(data, { presence: 'required' })

    const isLabelTaken = await getClusterByLabel(data.label)
    if (isLabelTaken) throw new Error('Ce label existe déjà pour un autre cluster')

    // TODO check if secretName is available with validation plugins
    const clusterData = structuredClone(data)
    const kubeConfig = {
      user: clusterData.user,
      cluster: clusterData.cluster,
    }
    delete clusterData.projectsId
    delete clusterData.user
    delete clusterData.cluster
    cluster = await createCluster(clusterData, kubeConfig)

    for (const projectId of data.projectsId) {
      await addClusterToProjectWithIds(cluster.id, projectId)
    }

    // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
    const results = await hooks.createCluster.execute({ ...cluster, user: data.user, cluster: data.cluster })
    // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
    await addLogs('Create Cluster', results, userId)

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
}

// PUT
export const updateClusterController = async (req: EnhancedFastifyRequest<UpdateClusterDto>, res) => {
  const data = req.body
  const clusterId = req.params?.clusterId
  if (data?.privacy === 'public') delete data.projectsId

  let cluster: AsyncReturnType<typeof updateCluster>
  try {
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
    cluster = await updateCluster(clusterId, clusterData, kubeConfig)

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
