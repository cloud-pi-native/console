import type { CreateZoneBody, UpdateZoneBody } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

export const getZones = async () => {
  const response = await apiClient.Zones.getZones()
  if (response.status === 200) return response.body
}

export const createZone = async (data: CreateZoneBody) => {
  const response = await apiClient.ZonesAdmin.createZone({ body: data })
  if (response.status === 201) return response.body
}

export const updateZone = async (zoneId: string, data: UpdateZoneBody) => {
  const response = await apiClient.ZonesAdmin.updateZone({ body: data, params: { zoneId } })
  if (response.status === 201) return response.body
}

export const deleteZone = async (zoneId: string) => {
  const response = await apiClient.ZonesAdmin.deleteZone({ params: { zoneId } })
  if (response.status === 204) return response.body
}
