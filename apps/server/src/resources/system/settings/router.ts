import type { SystemSettings } from '@cpn-console/shared'
import { AdminAuthorized, systemSettingsContract } from '@cpn-console/shared'
import { getSystemSettings, upsertSystemSettings } from './business.js'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { Forbidden403 } from '@/utils/errors.js'

export function systemSettingsRouter() {
  return serverInstance.router(systemSettingsContract, {
    listSystemSettings: async () => {
      const systemSettings = await getSystemSettings()

      if (!systemSettings) {
        return {
          status: 500,
          body: { error: 'System settings not found' },
        }
      }
      return {
        status: 200,
        body: systemSettings,
      }
    },

    upsertSystemSettings: async ({ request: req, body: data }) => {
      const perms = await authUser(req)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

      const systemSetting = await upsertSystemSettings(data) as SystemSettings

      return {
        status: 201,
        body: systemSetting,
      }
    },
  })
}
