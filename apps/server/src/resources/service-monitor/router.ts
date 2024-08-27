import { serviceContract } from '@cpn-console/shared'
import { checkServicesHealth } from './business.js'
import { serverInstance } from '@/app.js'

export function serviceMonitorRouter() {
  return serverInstance.router(serviceContract, {
    getServiceHealth: async () => {
      const serviceData = await checkServicesHealth()

      return {
        status: 200,
        body: serviceData,
      }
    },
  })
}
