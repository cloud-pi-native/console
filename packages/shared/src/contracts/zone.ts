import type { ClientInferRequest } from '@ts-rest/core'
import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  ZoneSchema,
} from '../schemas/index.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const zoneContract = contractInstance.router({
  listZones: {
    method: 'GET',
    path: `${apiPrefix}/zones`,
    summary: 'Get zones',
    description: 'Get all zones.',
    responses: {
      200: ZoneSchema.array(),
      400: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  createZone: {
    method: 'POST',
    path: `${apiPrefix}/zones`,
    contentType: 'application/json',
    summary: 'Create zone',
    description: 'Create new zone.',
    body: ZoneSchema
      .omit({ id: true })
      .extend({ clusterIds: z.string().uuid().array().optional() }),
    responses: {
      201: ZoneSchema,
      400: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  updateZone: {
    method: 'PUT',
    path: `${apiPrefix}/zones/:zoneId`,
    summary: 'Update zone',
    description: 'Update a zone by its ID.',
    pathParams: z.object({
      zoneId: z.string()
        .uuid(),
    }),
    body: ZoneSchema.omit({ id: true, slug: true }),
    responses: {
      201: ZoneSchema,
      400: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  deleteZone: {
    method: 'DELETE',
    path: `${apiPrefix}/zones/:zoneId`,
    summary: 'Delete zone',
    description: 'Delete a zone by its ID.',
    body: null,
    pathParams: z.object({
      zoneId: z.string()
        .uuid(),
    }),
    responses: {
      204: null,
      500: ErrorSchema,
    },
  },
}, {
  baseHeaders,
})

export type CreateZoneBody = ClientInferRequest<typeof zoneContract.createZone>['body']
export type UpdateZoneBody = ClientInferRequest<typeof zoneContract.updateZone>['body']
