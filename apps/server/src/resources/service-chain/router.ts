import type { AsyncReturnType } from '@cpn-console/shared'
import { AdminAuthorized, serviceChainContract } from '@cpn-console/shared'
import { serverInstance } from '../../app.ts'
import { authUser } from '../../utils/controller.ts'
import { Forbidden403 } from '../../utils/errors.ts'
import {
  getServiceChainDetails as getServiceChainDetailsBusiness,
  getServiceChainFlows as getServiceChainFlowsBusiness,
  listServiceChains as listServiceChainsBusiness,
  retryServiceChain as retryServiceChainBusiness,
  validateServiceChain as validateServiceChainBusiness,
} from './business.ts'
import '../../types/index.ts'

export function serviceChainRouter() {
  return serverInstance.router(serviceChainContract, {
    listServiceChains: async ({ request: req }) => {
      const { adminPermissions } = await authUser(req)

      let body: AsyncReturnType<typeof listServiceChainsBusiness> = []
      if (AdminAuthorized.ListSystem(adminPermissions)) {
        body = await listServiceChainsBusiness()
      }

      return {
        status: 200,
        body,
      }
    },

    getServiceChainDetails: async ({ params, request: req }) => {
      const perms = await authUser(req)

      if (!AdminAuthorized.ListSystem(perms.adminPermissions))
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

      if (!AdminAuthorized.ManageSystem(perms.adminPermissions))
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

      if (!AdminAuthorized.ManageSystem(perms.adminPermissions))
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

      if (!AdminAuthorized.ListSystem(perms.adminPermissions))
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
