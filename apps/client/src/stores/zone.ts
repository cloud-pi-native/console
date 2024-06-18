import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ResourceById, Zone } from '@cpn-console/shared'
import api from '@/api/index.js'

export const useZoneStore = defineStore('zone', () => {
  const zones = ref<Zone[]>([])
  const zonesById = ref<ResourceById<Zone>>({})

  const getAllZones = async () => {
    const res = await api.getZones()
    zones.value = res
    zonesById.value = zones.value.reduce((acc, curr) => {
      acc[curr.id] = curr
      return acc
    }, {} as ResourceById<Zone>)
  }

  return {
    zones,
    zonesById,
    getAllZones,
  }
})
