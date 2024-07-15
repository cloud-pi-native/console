import { clusterContract } from '@cpn-console/shared'
import { addReqLogs } from '@/utils/logger.js'
import {
  getAllUserClusters,
  createCluster,
  deleteCluster,
  getClusterAssociatedEnvironments,
  getClusterDetails as getClusterDetailsBusiness,
  updateCluster,
} from './business.js'
import '@/types/index.js'
import { serverInstance } from '@/app.js'
import { assertIsAdmin } from '@/utils/controller.js'

export const clusterRouter = () => serverInstance.router(clusterContract, {
  listClusters: async ({ request: req }) => {
    const user = req.session.user
    const cleanedClusters = await getAllUserClusters(user)

    addReqLogs({ req, message: 'Clusters récupérés avec succès' })
    return {
      status: 200,
      body: cleanedClusters,
    }
  },

  getClusterDetails: async ({ params, request: req }) => {
    assertIsAdmin(req.session.user)
    const clusterId = params.clusterId
    const cluster = await getClusterDetailsBusiness(clusterId)

    return {
      status: 200,
      body: cluster,
    }
  },

  createCluster: async ({ request: req, body: data }) => {
    assertIsAdmin(req.session.user)
    const userId = req.session.user.id

    const cluster = await createCluster(data, userId, req.id)

    addReqLogs({ req, message: 'Cluster créé avec succès', infos: { clusterId: cluster.id } })
    return {
      status: 201,
      body: cluster,
    }
  },

  getClusterEnvironments: async ({ request: req, params }) => {
    assertIsAdmin(req.session.user)
    const clusterId = params.clusterId
    const environments = await getClusterAssociatedEnvironments(clusterId)

    addReqLogs({ req, message: 'Environnements associés au cluster récupérés', infos: { clusterId } })
    return {
      status: 200,
      body: environments,
    }
  },

  updateCluster: async ({ request: req, params, body: data }) => {
    assertIsAdmin(req.session.user)
    const userId = req.session.user.id
    const clusterId = params.clusterId

    const cluster = await updateCluster(data, clusterId, userId, req.id)

    addReqLogs({ req, message: 'Cluster mis à jour avec succès', infos: { clusterId: cluster.id } })
    return {
      status: 200,
      body: cluster,
    }
  },

  deleteCluster: async ({ request: req, params }) => {
    assertIsAdmin(req.session.user)
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
