import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Zone } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useZoneStore = defineStore('zone', () => {
  const zones = ref<Zone[]>([])

  const getAllZones = async () => {
    zones.value = await apiClient.Zones.getZones()
      .then(response => extractData(response, 200))
    return zones.value
  }

  return {
    zones,
    getAllZones,
  }
})
