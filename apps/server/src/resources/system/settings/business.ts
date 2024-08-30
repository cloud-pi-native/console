import type { UpsertSystemSettingsBody } from '@cpn-console/shared'
import { upsertSystemSetting as upsertSystemSettingQuery } from './queries.js'

import { config } from '@/utils/config.js'

export function getSystemSettings(key?: keyof typeof config) {
  if (key) {
    return { [key]: config[key] }
  } else {
    return config
  }
}

export const upsertSystemSettings = (newSystemSetting: UpsertSystemSettingsBody) => upsertSystemSettingQuery(newSystemSetting)
