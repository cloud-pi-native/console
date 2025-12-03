import type { AsyncReturnType } from '@cpn-console/shared'
import { AdminAuthorized, serviceChainContract } from '@cpn-console/shared'
import {
  listServiceChains as listServiceChainsBusiness,
  getServiceChainDetails as getServiceChainDetailsBusiness,
  retryServiceChain as retryServiceChainBusiness,
  validateServiceChain as validateServiceChainBusiness,
  getServiceChainFlows as getServiceChainFlowsBusiness,
} from './business.js'
import '@old-server/types/index.js'
import { serverInstance } from '@old-server/app.js'
import { authUser } from '@old-server/utils/controller.js'
import { Forbidden403 } from '@old-server/utils/errors.js'

export function serviceChainRouter() {
  return serverInstance.router(serviceChainContract, {
    listServiceChains: async ({ request: req }) => {
      const { adminPermissions } = await authUser(req)

      let body: AsyncReturnType<typeof listServiceChainsBusiness> = []
      if (AdminAuthorized.isAdmin(adminPermissions)) {
        body = await listServiceChainsBusiness()
      }

      return {
        status: 200,
        body,
      }
    },

    getServiceChainDetails: async ({ params, request: req }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions))
        return new Forbidden403()

      const serviceChainId = params.serviceChainId
      const serviceChainDetails
        = await getServiceChainDetailsBusiness(serviceChainId)

      return {
        status: 200,
        body: serviceChainDetails,
      }
    },

    retryServiceChain: async ({ params, request: req }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions))
        return new Forbidden403()

      const serviceChainId = params.serviceChainId
      await retryServiceChainBusiness(serviceChainId)

      return {
        status: 204,
        body: null,
      }
    },

    validateServiceChain: async ({ params, request: req }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions))
        return new Forbidden403()

      const serviceChainId = params.validationId
      await validateServiceChainBusiness(serviceChainId)

      return {
        status: 204,
        body: null,
      }
    },

    getServiceChainFlows: async ({ params, request: req }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions))
        return new Forbidden403()

      const serviceChainId = params.serviceChainId
      const serviceChainFlows
        = await getServiceChainFlowsBusiness(serviceChainId)

      return {
        status: 200,
        body: serviceChainFlows,
      }
    },

  })
}
