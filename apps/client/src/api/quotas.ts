import type { CreateQuotaBody, UpdateQuotaStageBody, PatchQuotaBody } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

export const getQuotas = async () => {
  const response = await apiClient.Quotas.getQuotas()
  if (response.status === 200) return response.body
}

// Admin
export const getQuotaAssociatedEnvironments = async (quotaId: string) => {
  const response = await apiClient.QuotasAdmin.getQuotaEnvironments({ params: { quotaId } })
  if (response.status === 200) return response.body
}

export const addQuota = async (data: CreateQuotaBody) => {
  const response = await apiClient.QuotasAdmin.createQuota({ body: data })
  if (response.status === 201) return response.body
}

export const updateQuotaPrivacy = async (quotaId: string, data: PatchQuotaBody) => {
  const response = await apiClient.QuotasAdmin.patchQuotaPrivacy({ body: data, params: { quotaId } })
  if (response.status === 200) return response.body
}

export const updateQuotaStage = async (data: UpdateQuotaStageBody) => {
  const response = await apiClient.QuotasAdmin.updateQuotaStage({ body: data })
  if (response.status === 200) return response.body
}

export const deleteQuota = async (quotaId: string) => {
  const response = await apiClient.QuotasAdmin.deleteQuota({ params: { quotaId } })
  if (response.status === 204) return response.body
}
