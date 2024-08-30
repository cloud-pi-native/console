import { defineStore } from 'pinia'
import type {
  SystemSettings,
} from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useSystemSettingsStore = defineStore('systemSettings', () => {
  const systemSettings = ref<SystemSettings>()

  const listSystemSettings = async (key?: keyof SystemSettings) => {
    systemSettings.value = await apiClient.SystemSettings.listSystemSettings({ query: { key } })
      .then(response => extractData(response, 200))
  }

  // const upsertSystemSetting = async (newSystemSetting: UpsertSystemSettingBody) => {
  //   const res = await apiClient.SystemSettings.upsertSystemSetting({ body: newSystemSetting })
  //     .then(response => extractData(response, 201))
  //   systemSettings.value = systemSettings.value
  //     .toSpliced(systemSettings.value
  //       .findIndex(systemSetting => systemSetting.key === res.key), 1, res)
  //   return res
  // }

  return {
    systemSettings,
    listSystemSettings,
    // upsertSystemSetting,
  }
})
