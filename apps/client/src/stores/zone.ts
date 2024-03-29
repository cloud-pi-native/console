import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/index.js'

export const useZoneStore = defineStore('zone', () => {
  const zones = ref([])

  const getAllZones = async () => {
    zones.value = await api.getZones()
    return zones.value
  }

  return {
    zones,
    getAllZones,
  }
})
