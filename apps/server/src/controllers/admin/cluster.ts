import { createCluster, getClusterById, getClusterByLabel, getClusters, updateCluster } from '@/models/queries/cluster-queries.js'
import { EnhancedFastifyRequest } from '@/types'
import { addReqLogs } from '@/utils/logger.js'
import { sendBadRequest, sendCreated, sendNotFound, sendOk } from '@/utils/response.js'
import { CreateClusterDto, UpdateClusterDto, clusterSchema } from 'shared'

// GET
export const getAllClustersController = async (req, res) => {
  try {
    const clusters = await getClusters()
    addReqLogs({
      req,
      description: 'Clusters récupérés avec succès',
    })
    sendOk(res, clusters)
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

  let cluster
  try {
    await clusterSchema.validateAsync(data)

    const isLabelTaken = await getClusterByLabel(data.label)
    if (isLabelTaken) throw new Error('Ce label existe déjà pour un autre cluster')

    // TODO check if secretName is available with validation plugins
    cluster = await createCluster(data)

    addReqLogs({
      req,
      description: 'Cluster créé avec succès',
      extras: {
        clusterId: cluster.id,
      },
    })
    sendCreated(res, cluster.dataValues)
  } catch (error) {
    const description = 'Echec de la création de l\'organisation'
    addReqLogs({
      req,
      description,
      error,
    })
    sendBadRequest(res, description)
  }
}

// PUT
export const updateClusterController = async (req:EnhancedFastifyRequest<UpdateClusterDto>, res) => {
  const data = req.body

  let cluster
  try {
    await clusterSchema.validateAsync(data)
    const oldCluster = await getClusterById(data.id)
    if (!oldCluster) throw new Error('Aucun cluster trouvé pour cet id')
    if (data?.label && data.label !== oldCluster.label) throw new Error('Le label d\'un cluster ne peut être modifié')
    cluster = await updateCluster(data)

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
        clusterId: cluster.id,
      },
      error,
    })
    sendBadRequest(res, description)
  }
}
