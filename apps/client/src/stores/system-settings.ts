import type {
  SystemSettings,
  UpsertSystemSettingsBody,
} from '@cpn-console/shared'
import { defineStore } from 'pinia'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useSystemSettingsStore = defineStore('systemSettings', () => {
  const systemSettings = ref<SystemSettings>()

  const listSystemSettings = async () => {
    systemSettings.value = await apiClient.SystemSettings.listSystemSettings()
      .then(response => extractData(response, 200))
  }

  const upsertSystemSettings = async (newSystemSetting: UpsertSystemSettingsBody) => {
    systemSettings.value = await apiClient.SystemSettings.upsertSystemSettings({ body: newSystemSetting })
      .then(response => extractData(response, 201))
  }

  return {
    systemSettings,
    listSystemSettings,
    upsertSystemSettings,
  }
})
