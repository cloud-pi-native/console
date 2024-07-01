import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient, extractData } from '@/api/xhr-client.js'
import {
  type CreateQuotaBody,
  type Quota,
  type UpdateQuotaBody,
  resourceListToDict,
} from '@cpn-console/shared'

export const useQuotaStore = defineStore('quota', () => {
  const quotas = ref<Quota[]>([])
  const quotasById = computed(() => resourceListToDict(quotas.value))

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

  const updateQuota = async (quotaId: string, data: UpdateQuotaBody) =>
    apiClient.QuotasAdmin.updateQuota({ body: data, params: { quotaId } })
      .then(response => extractData(response, 200))

  const deleteQuota = (quotaId: string) =>
    apiClient.QuotasAdmin.deleteQuota({ params: { quotaId } })
      .then(response => extractData(response, 204))

  return {
    quotas,
    quotasById,
    getAllQuotas,
    getQuotaAssociatedEnvironments,
    addQuota,
    updateQuota,
    deleteQuota,
  }
})
