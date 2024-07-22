import { checkServicesHealth } from './business.js'
import { serviceContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'

export const serviceMonitorRouter = () => serverInstance.router(serviceContract, {
  getServiceHealth: async () => {
    const serviceData = await checkServicesHealth()

    return {
      status: 200,
      body: serviceData,
    }
  },
})
