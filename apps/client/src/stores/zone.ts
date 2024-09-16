import { apiClient, extractData } from '@/api/xhr-client.js'
import {
  type CreateZoneBody,
  resourceListToDict,
  type UpdateZoneBody,
  type Zone,
} from '@cpn-console/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useZoneStore = defineStore('zone', () => {
  const zones = ref<Zone[]>([])
  const zonesById = computed(() => resourceListToDict(zones.value))

  const getAllZones = async () => {
    zones.value = await apiClient.Zones.listZones()
      .then(response => extractData(response, 200))
    return zones.value
  }

  const createZone = (body: CreateZoneBody) =>
    apiClient.Zones.createZone({ body })
      .then(response => extractData(response, 201))

  const updateZone = (zoneId: Zone['id'], data: UpdateZoneBody) =>
    apiClient.Zones.updateZone({ body: data, params: { zoneId } })
      .then(response => extractData(response, 200))

  const deleteZone = (zoneId: Zone['id']) =>
    apiClient.Zones.deleteZone({ params: { zoneId } })
      .then(response => extractData(response, 204))

  return {
    zones,
    zonesById,
    getAllZones,
    createZone,
    updateZone,
    deleteZone,
  }
})
