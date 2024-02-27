import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateQuotaSchema,
  GetQuotasSchema,
  UpdateQuotaStageSchema,
  PatchQuotaSchema,
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

  updateQuotaStage: {
    method: 'PUT',
    path: `${apiPrefix}/admin/quotas/quotastages`,
    summary: 'Update a quota stage association',
    description: 'Update a quota stage association.',
    body: UpdateQuotaStageSchema.body,
    responses: UpdateQuotaStageSchema.responses,
  },

  patchQuotaPrivacy: {
    method: 'PATCH',
    path: `${apiPrefix}/admin/quotas/:quotaId/privacy`,
    summary: 'Update a quota privacy',
    description: 'Update a quota privacy.',
    pathParams: PatchQuotaSchema.params,
    body: PatchQuotaSchema.body,
    responses: PatchQuotaSchema.responses,
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
