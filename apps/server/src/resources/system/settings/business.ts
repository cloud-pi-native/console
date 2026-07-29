import type { UpsertSystemSettingBody } from '@cpn-console/shared'
import {
  getSystemSettings as getSystemSettingsQuery,
  upsertSystemSetting as upsertSystemSettingQuery,
} from './queries.js'

export const getSystemSettings = async (key?: string) => getSystemSettingsQuery({ key })

export const upsertSystemSetting = async (newSystemSetting: UpsertSystemSettingBody) => upsertSystemSettingQuery(newSystemSetting)
