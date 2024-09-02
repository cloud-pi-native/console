import type { UpsertSystemSettingsBody } from '@cpn-console/shared'
import { upsertSystemSetting as upsertSystemSettingQuery } from './queries.js'
import { getConfig } from '@/utils/config.js'

export const getSystemSettings = async () => getConfig()

export async function upsertSystemSettings(newSystemSettings: UpsertSystemSettingsBody) {
  if (!newSystemSettings) return getSystemSettings()
  for (const [key, value] of Object.entries(newSystemSettings)) {
    await upsertSystemSettingQuery({ key, value })
  }
  return await getSystemSettings()
}
