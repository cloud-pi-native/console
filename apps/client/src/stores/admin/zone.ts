import { defineStore } from 'pinia'
import type { CreateZoneBody, UpdateZoneBody, Zone } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useAdminZoneStore = defineStore('admin-zone', () => {
  const createZone = (body: CreateZoneBody) =>
    apiClient.Zones.createZone({ body })
      .then(response => extractData(response, 201))

  const updateZone = (zoneId: Zone['id'], data: UpdateZoneBody) =>
    apiClient.Zones.updateZone({ body: data, params: { zoneId } })
      .then(response => extractData(response, 201))

  const deleteZone = (zoneId: Zone['id']) =>
    apiClient.Zones.deleteZone({ params: { zoneId } })
      .then(response => extractData(response, 204))

  return {
    createZone,
    updateZone,
    deleteZone,
  }
})
