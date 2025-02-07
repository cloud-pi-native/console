import { AdminAuthorized, systemPluginContract } from '@cpn-console/shared'
import { deletePluginReport, getPluginConfig, getPluginReport, getPluginsConfig, listServices, updatePluginConfig } from './business.js'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { ErrorResType, Forbidden403 } from '@/utils/errors.js'

export function pluginRouter() {
  return serverInstance.router(systemPluginContract, {
    listPlugins: async ({ request: req }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const services = await listServices()

      return {
        status: 200,
        body: services,
      }
    },

    // Récupérer les configurations plugins
    getPluginsConfig: async ({ request: req }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const services = await getPluginsConfig()

      return {
        status: 200,
        body: services,

      }
    },

    getPluginConfig: async ({ request: req, params }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const services = await getPluginConfig(params.name)

      return {
        status: 200,
        body: services,

      }
    },

    getPluginReport: async ({ request: req, params }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const report = await getPluginReport(params.name)

      return {
        status: 200,
        body: report,
      }
    },

    // Mettre à jour les configurations plugins
    updatePluginsConfig: async ({ request: req, body }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const resBody = await updatePluginConfig(body)
      if (resBody instanceof ErrorResType) return resBody

      return {
        status: 204,
        body: resBody,
      }
    },

    deletePluginReport: async ({ request: req, params }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      await deletePluginReport(params.name)

      return {
        status: 204,
        body: null,
      }
    },
  })
}
