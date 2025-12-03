import { AdminAuthorized, systemSettingsContract } from '@cpn-console/shared'
import { getSystemSettings, upsertSystemSetting } from './business.js'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { Forbidden403 } from '@/utils/errors.js'

export function systemSettingsRouter() {
  return serverInstance.router(systemSettingsContract, {
    listSystemSettings: async ({ query }) => {
      const systemSettings = await getSystemSettings(query.key)

      return {
        status: 200,
        body: systemSettings,
      }
    },

    upsertSystemSetting: async ({ request: req, body: data }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const systemSetting = await upsertSystemSetting(data)

      return {
        status: 201,
        body: systemSetting,
      }
    },
  })
}
