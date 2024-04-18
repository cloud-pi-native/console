import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Zone } from '@cpn-console/shared'
import api from '@/api/index.js'

export const useZoneStore = defineStore('zone', () => {
  const zones = ref<Zone[]>([])

  const getAllZones = async () => {
    const res = await api.getZones()
    if (!res) return
    zones.value = res
    return zones.value
  }

  return {
    zones,
    getAllZones,
  }
})
