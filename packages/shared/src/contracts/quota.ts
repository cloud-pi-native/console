import type { ClientInferRequest, ClientInferResponseBody } from '@ts-rest/core'
import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client.js'
import { QuotaSchema } from '../schemas/index.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const quotaContract = contractInstance.router({
  listQuotas: {
    method: 'GET',
    path: '',
    summary: 'Get quotas',
    description: 'Retrieve all quotas.',
    responses: {
      200: z.array(QuotaSchema),
      500: ErrorSchema,
    },
  },

  createQuota: {
    method: 'POST',
    path: '',
    contentType: 'application/json',
    summary: 'Create quota',
    description: 'Create new quota.',
    body: QuotaSchema.omit({ id: true }).partial({ stageIds: true }),
    responses: {
      201: QuotaSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },

  listQuotaEnvironments: {
    method: 'GET',
    path: `/:quotaId/environments`,
    summary: 'Get a quota\'s environment',
    description: 'Retrieved environments associated to a quota.',
    pathParams: z.object({
      quotaId: z.string()
        .uuid(),
    }),
    responses: {
      200: z.array(z.object({
        project: z.string(),
        name: z.string(),
        stage: z.string(),
        owner: z.string(),
      })),
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  updateQuota: {
    method: 'PUT',
    path: `/:quotaId`,
    summary: 'Update a quota privacy',
    description: 'Update a quota privacy.',
    pathParams: z.object({
      quotaId: z.string()
        .uuid(),
    }),
    body: QuotaSchema.pick({
      isPrivate: true,
      cpu: true,
      memory: true,
      stageIds: true,
      name: true,
    }).partial(),
    responses: {
      200: QuotaSchema,
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },

  deleteQuota: {
    method: 'DELETE',
    path: `/:quotaId`,
    summary: 'Delete quota',
    description: 'Delete a quota by its ID.',
    body: null,
    pathParams: z.object({
      quotaId: z.string()
        .uuid(),
    }),
    responses: {
      204: null,
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },
}, {
  baseHeaders,
  pathPrefix: `${apiPrefix}/quotas`,
})

export type CreateQuotaBody = ClientInferRequest<typeof quotaContract.createQuota>['body']

export type UpdateQuotaBody = ClientInferRequest<typeof quotaContract.updateQuota>['body']

export type QuotaAssociatedEnvironments = ClientInferResponseBody<typeof quotaContract.listQuotaEnvironments, 200>
