import { type CreateClusterDto, type UpdateClusterDto } from '@dso-console/shared'
import { EnhancedFastifyRequest } from '@/types/index.js'
import { addReqLogs } from '@/utils/logger.js'
import { sendCreated, sendOk } from '@/utils/response.js'
import {
  checkClusterProjectsId,
  getAllCleanedClusters,
  createCluster,
  updateCluster,
} from './business.js'

// GET
export const getAllClustersController = async (req, res) => {
  const cleanedClusters = await getAllCleanedClusters()

  addReqLogs({
    req,
    description: 'Clusters récupérés avec succès',
  })
  sendOk(res, cleanedClusters)
}

// POST
export const createClusterController = async (req: EnhancedFastifyRequest<CreateClusterDto>, res) => {
  const data = req.body
  const userId = req.session?.user?.id

  data.projectsId = checkClusterProjectsId(data)

  const cluster = await createCluster(data, userId)

  addReqLogs({
    req,
    description: 'Cluster créé avec succès',
    extras: {
      clusterId: cluster.id,
    },
  })
  sendCreated(res, cluster)
}

// PUT
export const updateClusterController = async (req: EnhancedFastifyRequest<UpdateClusterDto>, res) => {
  const data = req.body
  const clusterId = req.params?.clusterId

  const cluster = await updateCluster(data, clusterId)

  addReqLogs({
    req,
    description: 'Cluster mis à jour avec succès',
    extras: {
      clusterId: cluster.id,
    },
  })
  sendOk(res, cluster)
}
