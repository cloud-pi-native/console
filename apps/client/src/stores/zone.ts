import { defineStore } from 'pinia'
import { ref } from 'vue'
import { resourceListToDict, type ResourceById, type Zone } from '@cpn-console/shared'
import api from '@/api/index.js'

export const useZoneStore = defineStore('zone', () => {
  const zones = ref<Zone[]>([])
  const zonesById = ref<ResourceById<Zone>>({})

  const getAllZones = async () => {
    const res = await api.getZones()
    zones.value = res
    zonesById.value = resourceListToDict(zones.value)
  }

  return {
    zones,
    zonesById,
    getAllZones,
  }
})
