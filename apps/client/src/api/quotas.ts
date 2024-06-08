import type { CreateQuotaBody, UpdateQuotaStageBody, PatchQuotaBody } from '@cpn-console/shared'
import { apiClient, extractData } from './xhr-client.js'

export const getQuotas = () =>
  apiClient.Quotas.getQuotas()
    .then(response => extractData(response, 200))

// Admin
export const getQuotaAssociatedEnvironments = (quotaId: string) =>
  apiClient.QuotasAdmin.getQuotaEnvironments({ params: { quotaId } })
    .then(response => extractData(response, 200))

export const addQuota = (data: CreateQuotaBody) =>
  apiClient.QuotasAdmin.createQuota({ body: data })
    .then(response => extractData(response, 201))

export const updateQuotaPrivacy = (quotaId: string, data: PatchQuotaBody) =>
  apiClient.QuotasAdmin.patchQuotaPrivacy({ body: data, params: { quotaId } })
    .then(response => extractData(response, 200))

export const updateQuotaStage = (data: UpdateQuotaStageBody) =>
  apiClient.QuotasAdmin.updateQuotaStage({ body: data })
    .then(response => extractData(response, 200))

export const deleteQuota = (quotaId: string) =>
  apiClient.QuotasAdmin.deleteQuota({ params: { quotaId } })
    .then(response => extractData(response, 204))
