import { serverInstance } from '@/app.js'
import '@/types/index.js'
import { addReqLogs } from '@/utils/logger.js'
import { clusterAdminContract, type Cluster } from '@cpn-console/shared'
import {
  checkClusterProjectIds,
  createCluster,
  deleteCluster,
  getClusterAssociatedEnvironments,
  updateCluster,
} from './business.js'

export const clusterAdminRouter = () => serverInstance.router(clusterAdminContract, {
  createCluster: async ({ request: req, body: data }) => {
    const userId = req.session.user.id

    data.projectIds = checkClusterProjectIds(data)
    const cluster = await createCluster(data, userId, req.id)

    addReqLogs({ req, message: 'Cluster créé avec succès', infos: { clusterId: cluster.id } })
    return {
      status: 201,
      body: cluster as unknown as Cluster,
    }
  },

  getClusterEnvironments: async ({ request: req, params }) => {
    const clusterId = params.clusterId
    const environments = await getClusterAssociatedEnvironments(clusterId)

    addReqLogs({ req, message: 'Environnements associés au cluster récupérés', infos: { clusterId } })
    return {
      status: 200,
      body: environments,
    }
  },

  updateCluster: async ({ request: req, params, body: data }) => {
    const userId = req.session.user.id
    const clusterId = params.clusterId

    const cluster = await updateCluster(data, clusterId, userId, req.id)

    addReqLogs({ req, message: 'Cluster mis à jour avec succès', infos: { clusterId: cluster.id } })
    return {
      status: 200,
      body: cluster as unknown as Cluster,
    }
  },

  deleteCluster: async ({ request: req, params }) => {
    const userId = req.session.user.id
    const clusterId = params.clusterId

    await deleteCluster(clusterId, userId, req.id)

    addReqLogs({ req, message: 'Cluster supprimé avec succès', infos: { clusterId } })
    return {
      status: 204,
      body: null,
    }
  },
})
