import { serverInstance } from '@/app.js'
import { addReqLogs } from '@/utils/logger.js'
import { getZones } from './business.js'
import { zoneContract } from '@cpn-console/shared'

export const zoneRouter = () => serverInstance.router(zoneContract, {
  getZones: async ({ request: req }) => {
    const zones = await getZones()

    addReqLogs({ req, message: 'Zones récupérées avec succès' })
    return {
      status: 200,
      body: zones,
    }
  },
})
