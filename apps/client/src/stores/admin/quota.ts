import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/api/xhr-client.js'
import type { CreateQuotaDto, QuotaModel, UpdateQuotaStageDto, UpdateQuotaPrivacyDto, QuotaParams } from '@dso-console/shared'

export const useAdminQuotaStore = defineStore('admin-quota', () => {
  const quotas = ref<QuotaModel[]>([])

  const getAllQuotas = async () => {
    // @ts-ignore
    quotas.value = (await apiClient.v1QuotasList()).data
  }

  const getQuotaAssociatedEnvironments = async (quotaId: string) => {
    return (await apiClient.v1AdminQuotasEnvironmentsDetail(quotaId)).data
  }

  const addQuota = async (quota: CreateQuotaDto) => {
    return (await apiClient.v1AdminQuotasCreate(quota)).data
  }

  const updateQuotaPrivacy = async (quotaId: string, isPrivate: UpdateQuotaPrivacyDto['isPrivate']) => {
    return (await apiClient.v1AdminQuotasPrivacyPartialUpdate(quotaId, { isPrivate })).data
  }

  const updateQuotaStage = async (quotaId: QuotaParams['quotaId'], stageIds: UpdateQuotaStageDto['stageIds']) => {
    return (await apiClient.v1AdminQuotasQuotastagesUpdate({ quotaId, stageIds })).data
  }

  const deleteQuota = async (quotaId: string) => {
    return (await apiClient.v1AdminQuotasDelete(quotaId)).data
  }

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
