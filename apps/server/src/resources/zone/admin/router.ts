import { serverInstance } from '@/app.js'
import { addReqLogs } from '@/utils/logger.js'
import { zoneAdminContract } from '@cpn-console/shared'
import {
  createZone,
  updateZone,
  deleteZone,
} from './business.js'

export const zoneAdminRouter = () => serverInstance.router(zoneAdminContract, {
  createZone: async ({ request: req, body: data }) => {
    const zone = await createZone(data)

    addReqLogs({ req, message: 'Zone créée avec succès', infos: { zoneId: zone.id } })
    return {
      status: 201,
      body: zone,
    }
  },

  updateZone: async ({ request: req, params, body: data }) => {
    const zoneId = params.zoneId

    const zone = await updateZone(zoneId, data)
    addReqLogs({ req, message: 'Zone mise à jour avec succès', infos: { zoneId: zone.id } })
    return {
      status: 201,
      body: zone,
    }
  },

  deleteZone: async ({ request: req, params }) => {
    const zoneId = params.zoneId

    await deleteZone(zoneId)

    addReqLogs({ req, message: 'Zone supprimée avec succès', infos: { zoneId } })
    return {
      status: 204,
      body: null,
    }
  },
})
