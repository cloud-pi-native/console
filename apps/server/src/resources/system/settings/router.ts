import { systemSettingsContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'
import { addReqLogs } from '@/utils/logger.js'
import { assertIsAdmin } from '@/utils/controller.js'
import { getSystemSettings, upsertSystemSetting } from './business.js'

export const systemSettingsRouter = () => serverInstance.router(systemSettingsContract, {
  listSystemSettings: async ({ request: req, query }) => {
    const requestor = req.session.user
    const systemSettings = await getSystemSettings(query.key)

    addReqLogs({
      req,
      message: 'Paramètres du système récupérés avec succès',
      infos: {
        userId: requestor.id,
      },
    })
    return {
      status: 200,
      body: systemSettings,
    }
  },

  upsertSystemSetting: async ({ request: req, body: data }) => {
    const requestor = req.session.user
    assertIsAdmin(requestor)

    const systemSetting = await upsertSystemSetting(data)

    addReqLogs({
      req,
      message: `Paramètre ${data.key} du système mis à jour avec succès`,
      infos: {
        userId: requestor.id,
      },
    })
    return {
      status: 201,
      body: systemSetting,
    }
  },
})
