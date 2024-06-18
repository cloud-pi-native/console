import { ClientInferRequest, ClientInferResponseBody } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateQuotaSchema,
  GetQuotasSchema,
  UpdateQuotaSchema,
  DeleteQuotaSchema,
  GetQuotaEnvironmentsSchema,
} from '../schemas/index.js'

export const quotaContract = contractInstance.router({
  getQuotas: {
    method: 'GET',
    path: `${apiPrefix}/quotas`,
    summary: 'Get quotas',
    description: 'Retrieved all quotas.',
    responses: GetQuotasSchema.responses,
  },
})

export const quotaAdminContract = contractInstance.router({
  createQuota: {
    method: 'POST',
    path: `${apiPrefix}/admin/quotas`,
    contentType: 'application/json',
    summary: 'Create quota',
    description: 'Create new quota.',
    body: CreateQuotaSchema.body,
    responses: CreateQuotaSchema.responses,
  },

  getQuotaEnvironments: {
    method: 'GET',
    path: `${apiPrefix}/admin/quotas/:quotaId/environments`,
    pathParams: GetQuotaEnvironmentsSchema.params,
    summary: 'Get a quota\'s environment',
    description: 'Retrieved environments associated to a quota.',
    responses: GetQuotaEnvironmentsSchema.responses,
  },

  updateQuota: {
    method: 'PUT',
    path: `${apiPrefix}/admin/quotas/:quotaId`,
    summary: 'Update a quota privacy',
    description: 'Update a quota privacy.',
    pathParams: UpdateQuotaSchema.params,
    body: UpdateQuotaSchema.body,
    responses: UpdateQuotaSchema.responses,
  },

  deleteQuota: {
    method: 'DELETE',
    path: `${apiPrefix}/admin/quotas/:quotaId`,
    summary: 'Delete quota',
    description: 'Delete a quota by its ID.',
    pathParams: DeleteQuotaSchema.params,
    body: null,
    responses: DeleteQuotaSchema.responses,
  },
})

export type CreateQuotaBody = ClientInferRequest<typeof quotaAdminContract.createQuota>['body']

export type UpdateQuotaBody = ClientInferRequest<typeof quotaAdminContract.updateQuota>['body']

export type QuotaAssociatedEnvironments = ClientInferResponseBody<typeof quotaAdminContract.getQuotaEnvironments, 200>
