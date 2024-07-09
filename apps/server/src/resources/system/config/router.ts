import { addReqLogs } from '@/utils/logger.js'
import { systemPluginContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'
import { getPluginsConfig, updatePluginConfig } from './business.js'
import { checkIsAdmin } from '@/utils/controller.js'

export const pluginConfigRouter = () => serverInstance.router(systemPluginContract, {
  // Récupérer les configurations plugins
  getPluginsConfig: async ({ request: req }) => {
    const requestor = req.session.user
    const services = await getPluginsConfig(requestor)
    addReqLogs({
      req,
      message: 'Configurations des plugins récupérées avec succès',
      infos: {
        userId: requestor.id,
      },
    })
    return {
      status: 200,
      body: services,
    }
  },
  // Mettre à jour les configurations plugins
  updatePluginsConfig: async ({ request: req, body }) => {
    const requestor = req.session.user
    checkIsAdmin(requestor)
    await updatePluginConfig(body)
    addReqLogs({
      req,
      message: 'Configurations des plugins mises à jour avec succès',
      infos: {
        userId: requestor.id,
      },
    })
    return {
      status: 204,
      body: null,
    }
  },
})
