import { serverInstance } from '@/app.js'
import { addReqLogs } from '@/utils/logger.js'
import { createZone, deleteZone, listZones, updateZone } from './business.js'
import { zoneContract } from '@cpn-console/shared'
import { assertIsAdmin } from '@/utils/controller.js'

export const zoneRouter = () => serverInstance.router(zoneContract, {
  listZones: async ({ request: req }) => {
    const zones = await listZones()

    addReqLogs({ req, message: 'Zones récupérées avec succès' })
    return {
      status: 200,
      body: zones,
    }
  },

  createZone: async ({ request: req, body: data }) => {
    assertIsAdmin(req.session.user)
    const zone = await createZone(data)

    addReqLogs({ req, message: 'Zone créée avec succès', infos: { zoneId: zone.id } })
    return {
      status: 201,
      body: zone,
    }
  },

  updateZone: async ({ request: req, params, body: data }) => {
    assertIsAdmin(req.session.user)
    const zoneId = params.zoneId

    const zone = await updateZone(zoneId, data)
    addReqLogs({ req, message: 'Zone mise à jour avec succès', infos: { zoneId: zone.id } })
    return {
      status: 201,
      body: zone,
    }
  },

  deleteZone: async ({ request: req, params }) => {
    assertIsAdmin(req.session.user)
    const zoneId = params.zoneId

    await deleteZone(zoneId)

    addReqLogs({ req, message: 'Zone supprimée avec succès', infos: { zoneId } })
    return {
      status: 204,
      body: null,
    }
  },
})
