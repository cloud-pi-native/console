import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CreateQuotaBody, Quota, UpdateQuotaStageBody, PatchQuotaBody } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useQuotaStore = defineStore('quota', () => {
  const quotas = ref<Quota[]>([])

  const getAllQuotas = async () => {
    quotas.value = await apiClient.Quotas.getQuotas()
      .then(response => extractData(response, 200))
    return quotas.value
  }

  const getQuotaAssociatedEnvironments = (quotaId: string) =>
    apiClient.QuotasAdmin.getQuotaEnvironments({ params: { quotaId } })
      .then(response => extractData(response, 200))

  const addQuota = (body: CreateQuotaBody) =>
    apiClient.QuotasAdmin.createQuota({ body })
      .then(response => extractData(response, 201))

  const updateQuotaPrivacy = (quotaId: string, isPrivate: PatchQuotaBody['isPrivate']) =>
    apiClient.QuotasAdmin.patchQuotaPrivacy({ body: { isPrivate }, params: { quotaId } })
      .then(response => extractData(response, 200))

  const updateQuotaStage = (quotaId: string, stageIds: UpdateQuotaStageBody['stageIds']) =>
    apiClient.QuotasAdmin.updateQuotaStage({ body: { quotaId, stageIds } })
      .then(response => extractData(response, 200))

  const deleteQuota = (quotaId: string) =>
    apiClient.QuotasAdmin.deleteQuota({ params: { quotaId } })
      .then(response => extractData(response, 204))

  return {
    quotas,
    getAllQuotas,
    getQuotaAssociatedEnvironments,
    addQuota,
    updateQuotaPrivacy,
    updateQuotaStage,
    deleteQuota,
  }
})
