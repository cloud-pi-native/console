import type { AsyncReturnType } from '@cpn-console/shared'
import { AdminAuthorized, clusterContract } from '@cpn-console/shared'
import {
  createCluster,
  deleteCluster,
  getClusterAssociatedEnvironments,
  getClusterDetails as getClusterDetailsBusiness,
  getClusterUsage,
  listClusters,
  updateCluster,
} from './business.js'
import '@/types/index.js'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { ErrorResType, Forbidden403, Unauthorized401 } from '@/utils/errors.js'

export function clusterRouter() {
  return serverInstance.router(clusterContract, {
    listClusters: async ({ request: req }) => {
      const { adminPermissions, user } = await authUser(req)

      let body: AsyncReturnType<typeof listClusters> = []
      if (AdminAuthorized.ListClusters(adminPermissions)) {
        body = await listClusters()
      } else if (user) {
        body = await listClusters(user.id)
      }

      return {
        status: 200,
        body,
      }
    },

    getClusterDetails: async ({ params, request: req }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.ListClusters(perms.adminPermissions)) return new Forbidden403()

      const clusterId = params.clusterId
      const cluster = await getClusterDetailsBusiness(clusterId)

      return {
        status: 200,
        body: cluster,
      }
    },

    getClusterUsage: async ({ params, request: req }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.ListClusters(perms.adminPermissions)) return new Forbidden403()

      const clusterId = params.clusterId
      const usage = await getClusterUsage(clusterId)

      return {
        status: 200,
        body: usage,
      }
    },

    createCluster: async ({ request: req, body: data }) => {
      const { adminPermissions, user } = await authUser(req)
      if (!AdminAuthorized.ManageClusters(adminPermissions)) return new Forbidden403()

      if (!user) return new Unauthorized401('Require to be requested from user not api key')
      const body = await createCluster(data, user.id, req.id)
      if (body instanceof ErrorResType) return body

      return {
        status: 201,
        body,
      }
    },

    getClusterEnvironments: async ({ request: req, params }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.ListClusters(perms.adminPermissions)) return new Forbidden403()

      const clusterId = params.clusterId
      const environments = await getClusterAssociatedEnvironments(clusterId)

      return {
        status: 200,
        body: environments,
      }
    },

    updateCluster: async ({ request: req, params, body: data }) => {
      const { user, adminPermissions } = await authUser(req)
      if (!AdminAuthorized.ManageClusters(adminPermissions)) return new Forbidden403()
      if (!user) return new Unauthorized401('Require to be requested from user not api key')

      const clusterId = params.clusterId
      const body = await updateCluster(data, clusterId, user.id, req.id)

      if (body instanceof ErrorResType) return body

      return {
        status: 200,
        body,
      }
    },

    deleteCluster: async ({ request: req, params, query: { force } }) => {
      const { user, adminPermissions, tokenId } = await authUser(req)
      if (!AdminAuthorized.isAdmin(adminPermissions)) return new Forbidden403()
      if (!user?.id && !tokenId) return new Unauthorized401('Your identity has not been found')

      const clusterId = params.clusterId
      const body = await deleteCluster({
        clusterId,
        userId: user?.id,
        requestId: req.id,
        force,
      })

      if (body instanceof ErrorResType) return body

      return {
        status: 204,
        body,
      }
    },
  })
}
