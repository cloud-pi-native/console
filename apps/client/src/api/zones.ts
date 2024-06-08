import type { CreateZoneBody, UpdateZoneBody } from '@cpn-console/shared'
import { apiClient, extractData } from './xhr-client.js'

export const getZones = () =>
  apiClient.Zones.getZones()
    .then(response => extractData(response, 200))

export const createZone = (data: CreateZoneBody) =>
  apiClient.ZonesAdmin.createZone({ body: data })
    .then(response => extractData(response, 201))

export const updateZone = (zoneId: string, data: UpdateZoneBody) =>
  apiClient.ZonesAdmin.updateZone({ body: data, params: { zoneId } })
    .then(response => extractData(response, 201))

export const deleteZone = (zoneId: string) =>
  apiClient.ZonesAdmin.deleteZone({ params: { zoneId } })
    .then(response => extractData(response, 204))
