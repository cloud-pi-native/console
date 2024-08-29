import type { ClientInferRequest } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateZoneSchema,
  DeleteZoneSchema,
  ListZonesSchema,
  UpdateZoneSchema,
} from '../schemas/index.js'

export const zoneContract = contractInstance.router({
  listZones: {
    method: 'GET',
    path: `${apiPrefix}/zones`,
    summary: 'Get zones',
    description: 'Get all zones.',
    responses: ListZonesSchema.responses,
  },

  createZone: {
    method: 'POST',
    path: `${apiPrefix}/zones`,
    contentType: 'application/json',
    summary: 'Create zone',
    description: 'Create new zone.',
    body: CreateZoneSchema.body,
    responses: CreateZoneSchema.responses,
  },

  updateZone: {
    method: 'PUT',
    path: `${apiPrefix}/zones/:zoneId`,
    summary: 'Update zone',
    description: 'Update a zone by its ID.',
    pathParams: UpdateZoneSchema.params,
    body: UpdateZoneSchema.body,
    responses: UpdateZoneSchema.responses,
  },

  deleteZone: {
    method: 'DELETE',
    path: `${apiPrefix}/zones/:zoneId`,
    summary: 'Delete zone',
    description: 'Delete a zone by its ID.',
    pathParams: DeleteZoneSchema.params,
    body: null,
    responses: DeleteZoneSchema.responses,
  },
})

export type CreateZoneBody = ClientInferRequest<typeof zoneContract.createZone>['body']

export type UpdateZoneBody = ClientInferRequest<typeof zoneContract.updateZone>['body']
