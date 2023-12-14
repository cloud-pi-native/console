import { type CreateClusterDto, type UpdateClusterDto, type ClusterParams } from '@dso-console/shared'
import { type FastifyRequestWithSession } from '@/types/index.js'
import { addReqLogs } from '@/utils/logger.js'
import { sendCreated, sendNoContent, sendOk } from '@/utils/response.js'
import {
  checkClusterProjectIds,
  createCluster,
  updateCluster,
  getClusterAssociatedEnvironments,
  deleteCluster,
} from './business.js'
import { type RouteHandler } from 'fastify'

// GET
export const getClusterAssociatedEnvironmentsController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: ClusterParams
}>, res) => {
  const clusterId = req.params.clusterId

  const environments = await getClusterAssociatedEnvironments(clusterId)

  addReqLogs({
    req,
    description: 'Environnements associés au cluster récupérés',
    extras: {
      clusterId,
    },
  })

  sendOk(res, environments)
}

// POST
export const createClusterController: RouteHandler = async (req: FastifyRequestWithSession<{
  Body: CreateClusterDto
}>, res) => {
  const data = req.body
  const userId = req.session?.user?.id

  data.projectIds = checkClusterProjectIds(data)

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
export const updateClusterController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: ClusterParams
  Body: UpdateClusterDto
}>, res) => {
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

// DELETE
export const deleteClusterController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: ClusterParams
}>, res) => {
  const clusterId = req.params?.clusterId
  const userId = req.session.user?.id

  await deleteCluster(clusterId, userId)

  addReqLogs({
    req,
    description: 'Cluster supprimé avec succès',
    extras: {
      clusterId,
    },
  })
  sendNoContent(res)
}
