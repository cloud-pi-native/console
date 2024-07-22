import { AdminAuthorized, clusterContract } from '@cpn-console/shared'
import {
  getClusters,
  createCluster,
  deleteCluster,
  getClusterAssociatedEnvironments,
  getClusterDetails as getClusterDetailsBusiness,
  updateCluster,
} from './business.js'
import '@/types/index.js'
import { serverInstance } from '@/app.js'
import { authUser, ErrorResType, Forbidden403 } from '@/utils/controller.js'

export const clusterRouter = () => serverInstance.router(clusterContract, {
  listClusters: async ({ request: req }) => {
    const user = req.session.user
    const { adminPermissions } = await authUser(user)
    const body = AdminAuthorized.ManageClusters(adminPermissions)
      ? await getClusters()
      : await getClusters(user.id)

    return {
      status: 200,
      body,
    }
  },

  getClusterDetails: async ({ params, request: req }) => {
    const user = req.session.user
    const perms = await authUser(user)
    if (!AdminAuthorized.ManageClusters(perms.adminPermissions)) return new Forbidden403()

    const clusterId = params.clusterId
    const cluster = await getClusterDetailsBusiness(clusterId)

    return {
      status: 200,
      body: cluster,
    }
  },

  createCluster: async ({ request: req, body: data }) => {
    const user = req.session.user
    const perms = await authUser(user)
    if (!AdminAuthorized.ManageClusters(perms.adminPermissions)) return new Forbidden403()
    if (!AdminAuthorized.ManageStages(perms.adminPermissions)) data.stageIds = []

    const body = await createCluster(data, user.id, req.id)
    if (body instanceof ErrorResType) return body

    return {
      status: 201,
      body,
    }
  },

  getClusterEnvironments: async ({ request: req, params }) => {
    const user = req.session.user
    const perms = await authUser(user)
    if (!AdminAuthorized.ManageClusters(perms.adminPermissions)) return new Forbidden403()

    const clusterId = params.clusterId
    const environments = await getClusterAssociatedEnvironments(clusterId)

    return {
      status: 200,
      body: environments,
    }
  },

  updateCluster: async ({ request: req, params, body: data }) => {
    const user = req.session.user
    const perms = await authUser(user)
    if (!AdminAuthorized.ManageClusters(perms.adminPermissions)) return new Forbidden403()
    if (!AdminAuthorized.ManageStages(perms.adminPermissions)) delete data.stageIds

    const clusterId = params.clusterId
    const body = await updateCluster(data, clusterId, user.id, req.id)

    if (body instanceof ErrorResType) return body

    return {
      status: 200,
      body,
    }
  },

  deleteCluster: async ({ request: req, params }) => {
    const user = req.session.user
    const perms = await authUser(user)
    if (!AdminAuthorized.ManageClusters(perms.adminPermissions)) return new Forbidden403()

    const clusterId = params.clusterId
    const body = await deleteCluster(clusterId, user.id, req.id)
    if (body instanceof ErrorResType) return body
    return {
      status: 200,
      body,
    }
  },
})
