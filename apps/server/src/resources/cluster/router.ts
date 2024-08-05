import { AdminAuthorized, clusterContract } from '@cpn-console/shared'
import {
  listClusters,
  createCluster,
  deleteCluster,
  getClusterAssociatedEnvironments,
  getClusterDetails as getClusterDetailsBusiness,
  updateCluster,
} from './business.js'
import '@/types/index.js'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { ErrorResType, Forbidden403 } from '@/utils/errors.js'

export const clusterRouter = () => serverInstance.router(clusterContract, {
  listClusters: async ({ request: req }) => {
    const requestor = req.session.user
    const { adminPermissions, user } = await authUser(requestor)

    const body = AdminAuthorized.isAdmin(adminPermissions)
      ? await listClusters()
      : await listClusters(user.id)

    return {
      status: 200,
      body,
    }
  },

  getClusterDetails: async ({ params, request: req }) => {
    const requestor = req.session.user
    const perms = await authUser(requestor)
    if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

    const clusterId = params.clusterId
    const cluster = await getClusterDetailsBusiness(clusterId)

    return {
      status: 200,
      body: cluster,
    }
  },

  createCluster: async ({ request: req, body: data }) => {
    const requestor = req.session.user
    const { adminPermissions, user } = await authUser(requestor)
    if (!AdminAuthorized.isAdmin(adminPermissions)) return new Forbidden403()

    const body = await createCluster(data, user.id, req.id)
    if (body instanceof ErrorResType) return body

    return {
      status: 201,
      body,
    }
  },

  getClusterEnvironments: async ({ request: req, params }) => {
    const requestor = req.session.user
    const perms = await authUser(requestor)
    if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

    const clusterId = params.clusterId
    const environments = await getClusterAssociatedEnvironments(clusterId)

    return {
      status: 200,
      body: environments,
    }
  },

  updateCluster: async ({ request: req, params, body: data }) => {
    const requestor = req.session.user
    const { user, adminPermissions } = await authUser(requestor)
    if (!AdminAuthorized.isAdmin(adminPermissions)) return new Forbidden403()

    const clusterId = params.clusterId
    const body = await updateCluster(data, clusterId, user.id, req.id)

    if (body instanceof ErrorResType) return body

    return {
      status: 200,
      body,
    }
  },

  deleteCluster: async ({ request: req, params }) => {
    const requestor = req.session.user
    const { user, adminPermissions } = await authUser(requestor)
    if (!AdminAuthorized.isAdmin(adminPermissions)) return new Forbidden403()

    const clusterId = params.clusterId
    const body = await deleteCluster(clusterId, user.id, req.id)

    if (body instanceof ErrorResType) return body

    return {
      status: 204,
      body,
    }
  },
})
