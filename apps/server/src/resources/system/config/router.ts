import { AdminAuthorized, systemPluginContract } from '@cpn-console/shared'
import { getPluginsConfig, updatePluginConfig } from './business.js'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { ErrorResType, Forbidden403 } from '@/utils/errors.js'

export function pluginConfigRouter() {
  return serverInstance.router(systemPluginContract, {
  // Récupérer les configurations plugins
    getPluginsConfig: async ({ request: req }) => {
      const perms = await authUser(req)

      if (!AdminAuthorized.ListSystem(perms.adminPermissions)) return new Forbidden403()

      const services = await getPluginsConfig()

      return {
        status: 200,
        body: services,

      }
    },
    // Mettre à jour les configurations plugins
    updatePluginsConfig: async ({ request: req, body }) => {
      const perms = await authUser(req)

      if (!AdminAuthorized.ManageSystem(perms.adminPermissions)) return new Forbidden403()

      const resBody = await updatePluginConfig(body)
      if (resBody instanceof ErrorResType) return resBody

      return {
        status: 204,
        body: resBody,
      }
    },
  })
}
