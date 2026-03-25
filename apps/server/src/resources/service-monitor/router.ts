import { AdminAuthorized, serviceContract } from '@cpn-console/shared'
import { serverInstance } from '../../app.ts'
import { authUser } from '../../utils/controller.ts'
import { Forbidden403 } from '../../utils/errors.ts'
import { checkServicesHealth, refreshServicesHealth } from './business.ts'

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

      if (!AdminAuthorized.ListSystem(adminPermissions)) return new Forbidden403()
      const serviceData = checkServicesHealth()

      return {
        status: 200,
        body: serviceData,
      }
    },

    refreshServiceHealth: async ({ request: req }) => {
      const { adminPermissions } = await authUser(req)

      if (!AdminAuthorized.ManageSystem(adminPermissions)) return new Forbidden403()

      await refreshServicesHealth()
      const serviceData = checkServicesHealth()

      return {
        status: 200,
        body: serviceData,
      }
    },
  })
}
