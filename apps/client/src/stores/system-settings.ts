import { defineStore } from 'pinia'
import type {
  UpsertSystemSettingBody,
  SystemSettings,
  systemSettingsContract,
} from '@cpn-console/shared'
import {
  resourceListToDictByKey,
} from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useSystemSettingsStore = defineStore('systemSettings', () => {
  const systemSettings = ref<SystemSettings>([])
  const systemSettingsByKey = computed(() => resourceListToDictByKey(systemSettings.value))

  const listSystemSettings = async (query: typeof systemSettingsContract.listSystemSettings.query._type = {}) => {
    systemSettings.value = await apiClient.SystemSettings.listSystemSettings(query)
      .then((response: any) => extractData(response, 200))
  }

  const upsertSystemSetting = async (newSystemSetting: UpsertSystemSettingBody) => {
    const res = await apiClient.SystemSettings.upsertSystemSetting({ body: newSystemSetting })
      .then((response: any) => extractData(response, 201))
    systemSettings.value = systemSettings.value
      .toSpliced(systemSettings.value
        .findIndex(systemSetting => systemSetting.key === res.key), 1, res)
    return res
  }

  return {
    systemSettings,
    systemSettingsByKey,
    listSystemSettings,
    upsertSystemSetting,
  }
})
