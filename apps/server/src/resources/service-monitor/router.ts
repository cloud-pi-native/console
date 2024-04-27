import { addReqLogs } from '@/utils/logger.js'
import { checkServicesHealth } from './business.js'
import { serviceContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'

export const serviceMonitorRouter = () => serverInstance.router(serviceContract, {
  getServiceHealth: async ({ request: req }) => {
    const serviceData = await checkServicesHealth()
    addReqLogs({
      req,
      message: 'Etats des services récupérés avec succès',
    })
    return {
      status: 200,
      body: serviceData,
    }
  },
})
