import { AdminAuthorized, systemPluginContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'
import { getPluginsConfig, updatePluginConfig } from './business.js'
import { authUser, Forbidden403, ErrorResType } from '@/utils/controller.js'

export const pluginConfigRouter = () => serverInstance.router(systemPluginContract, {
  // Récupérer les configurations plugins
  getPluginsConfig: async ({ request: req }) => {
    const user = req.session.user
    const perms = await authUser(user)
    if (!AdminAuthorized.ManagePlugins(perms.adminPermissions)) return new Forbidden403()

    const services = await getPluginsConfig()

    return {
      status: 200,
      body: services,

    }
  },
  // Mettre à jour les configurations plugins
  updatePluginsConfig: async ({ request: req, body }) => {
    const user = req.session.user
    const perms = await authUser(user)
    if (!AdminAuthorized.ManagePlugins(perms.adminPermissions)) return new Forbidden403()

    const resBody = await updatePluginConfig(body)
    if (resBody instanceof ErrorResType) return resBody
    return {
      status: 204,
      body: resBody,
    }
  },
})
