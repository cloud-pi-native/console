import { addReqLogs } from '@/utils/logger.js'
import { checkServicesHealth } from './business.js'
import { serviceContract } from '@cpn-console/shared'
import type { UserDetails } from '@/types/index.js'
import { serverInstance } from '@/app.js'

export const serviceRouter = () => serverInstance.router(serviceContract, {
  getServiceHealth: async ({ request: req }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { groups, ...rest } = req.session.user
    const requestor: Omit<UserDetails, 'groups'> = { ...rest }

    const serviceData = await checkServicesHealth(requestor)
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
