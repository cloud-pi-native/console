import { type UpsertSystemSettingBody } from '@cpn-console/shared'
import {
  getSystemSettings as getSystemSettingsQuery,
  getSystemSetting as getSystemSettingQuery,
  upsertSystemSetting as upsertSystemSettingQuery,
} from './queries.js'

export const getSystemSettings = async (key?: string) => {
  return key ? [await getSystemSettingQuery(key)] : getSystemSettingsQuery()
}

export const upsertSystemSetting = async (newSystemSetting: UpsertSystemSettingBody) => {
  return upsertSystemSettingQuery(newSystemSetting)
}
