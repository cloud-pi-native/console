import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  type Zone,
  resourceListToDict,
} from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useZoneStore = defineStore('zone', () => {
  const zones = ref<Zone[]>([])
  const zonesById = computed(() => resourceListToDict(zones.value))

  const getAllZones = async () => {
    zones.value = await apiClient.Zones.listZones()
      .then(response => extractData(response, 200))
    return zones.value
  }

  return {
    zones,
    zonesById,
    getAllZones,
  }
})
