import type { AsyncReturnType } from '@cpn-console/shared'
import { AdminAuthorized, serviceChainContract } from '@cpn-console/shared'
import {
  getServiceChainDetails as getServiceChainDetailsBusiness,
  listServiceChains,
} from './business.js'
import '@/types/index.js'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { Forbidden403 } from '@/utils/errors.js'

export function serviceChainRouter() {
  return serverInstance.router(serviceChainContract, {
    listServiceChains: async ({ request: req }) => {
      const { adminPermissions } = await authUser(req)

      let body: AsyncReturnType<typeof listServiceChains> = []
      if (AdminAuthorized.isAdmin(adminPermissions)) {
        body = await listServiceChains()
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
      const serviceChain = await getServiceChainDetailsBusiness(serviceChainId)

      return {
        status: 200,
        body: serviceChain,
      }
    },
  })
}
