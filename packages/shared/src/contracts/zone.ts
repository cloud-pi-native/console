import { apiPrefix, contractInstance } from '../api-client.js'
import {
  GetZonesSchema,
  CreateZoneSchema,
  UpdateZoneSchema,
  DeleteZoneSchema,
} from '../schemas/index.js'

export const zoneContract = contractInstance.router({
  getZones: {
    method: 'GET',
    path: `${apiPrefix}/zones`,
    summary: 'Get zones',
    description: 'Get all zones.',
    responses: GetZonesSchema.responses,
  },
})

export const zoneAdminContract = contractInstance.router({
  createZone: {
    method: 'POST',
    path: `${apiPrefix}/admin/zones`,
    contentType: 'application/json',
    summary: 'Create zone',
    description: 'Create new zone.',
    body: CreateZoneSchema.body,
    responses: CreateZoneSchema.responses,
  },

  updateZone: {
    method: 'PUT',
    path: `${apiPrefix}/admin/zones/:zoneId`,
    summary: 'Update zone',
    description: 'Update a zone by its ID.',
    pathParams: UpdateZoneSchema.params,
    body: UpdateZoneSchema.body,
    responses: UpdateZoneSchema.responses,
  },

  deleteZone: {
    method: 'DELETE',
    path: `${apiPrefix}/admin/zones/:zoneId`,
    summary: 'Delete zone',
    description: 'Delete a zone by its ID.',
    pathParams: DeleteZoneSchema.params,
    body: null,
    responses: DeleteZoneSchema.responses,
  },
})
