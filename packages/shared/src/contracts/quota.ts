import type { ClientInferRequest, ClientInferResponseBody } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateQuotaSchema,
  DeleteQuotaSchema,
  ListQuotaEnvironmentsSchema,
  ListQuotasSchema,
  UpdateQuotaSchema,
} from '../schemas/index.js'

export const quotaContract = contractInstance.router({
  listQuotas: {
    method: 'GET',
    path: `${apiPrefix}/quotas`,
    summary: 'Get quotas',
    description: 'Retrieve all quotas.',
    responses: ListQuotasSchema.responses,
  },

  createQuota: {
    method: 'POST',
    path: `${apiPrefix}/quotas`,
    contentType: 'application/json',
    summary: 'Create quota',
    description: 'Create new quota.',
    body: CreateQuotaSchema.body,
    responses: CreateQuotaSchema.responses,
  },

  listQuotaEnvironments: {
    method: 'GET',
    path: `${apiPrefix}/quotas/:quotaId/environments`,
    pathParams: ListQuotaEnvironmentsSchema.params,
    summary: 'Get a quota\'s environment',
    description: 'Retrieved environments associated to a quota.',
    responses: ListQuotaEnvironmentsSchema.responses,
  },

  updateQuota: {
    method: 'PUT',
    path: `${apiPrefix}/quotas/:quotaId`,
    summary: 'Update a quota privacy',
    description: 'Update a quota privacy.',
    pathParams: UpdateQuotaSchema.params,
    body: UpdateQuotaSchema.body,
    responses: UpdateQuotaSchema.responses,
  },

  deleteQuota: {
    method: 'DELETE',
    path: `${apiPrefix}/quotas/:quotaId`,
    summary: 'Delete quota',
    description: 'Delete a quota by its ID.',
    pathParams: DeleteQuotaSchema.params,
    body: null,
    responses: DeleteQuotaSchema.responses,
  },
})

export type CreateQuotaBody = ClientInferRequest<typeof quotaContract.createQuota>['body']

export type UpdateQuotaBody = ClientInferRequest<typeof quotaContract.updateQuota>['body']

export type QuotaAssociatedEnvironments = ClientInferResponseBody<typeof quotaContract.listQuotaEnvironments, 200>
