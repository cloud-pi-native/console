import { AdminAuthorized, serviceContract } from '@cpn-console/shared'
import { checkServicesHealth, refreshServicesHealth } from './business'
import { serverInstance } from '@/app'
import { authUser } from '@/utils/controller'
import { Forbidden403 } from '@/utils/errors'

export function serviceMonitorRouter() {
  return serverInstance.router(serviceContract, {
    getServiceHealth: async () => {
      const serviceData = checkServicesHealth()

      return {
        status: 200,
        body: serviceData,
      }
    },

    getCompleteServiceHealth: async ({ request: req }) => {
      const { adminPermissions } = await authUser(req)

      if (!AdminAuthorized.isAdmin(adminPermissions)) return new Forbidden403()
      const serviceData = checkServicesHealth()

      return {
        status: 200,
        body: serviceData,
      }
    },

    refreshServiceHealth: async ({ request: req }) => {
      const { adminPermissions } = await authUser(req)
      if (!AdminAuthorized.isAdmin(adminPermissions)) return new Forbidden403()

      await refreshServicesHealth()
      const serviceData = checkServicesHealth()

      return {
        status: 200,
        body: serviceData,
      }
    },
  })
}
