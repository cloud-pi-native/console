import { AdminAuthorized, systemSettingsContract } from '@cpn-console/shared'
import { serverInstance } from '../../../app.ts'
import { authUser } from '../../../utils/controller.ts'
import { Forbidden403 } from '../../../utils/errors.ts'
import { getSystemSettings, upsertSystemSetting } from './business.ts'

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

      if (!AdminAuthorized.ManageSystem(perms.adminPermissions)) return new Forbidden403()

      const systemSetting = await upsertSystemSetting(data)

      return {
        status: 201,
        body: systemSetting,
      }
    },
  })
}
