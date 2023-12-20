import { defineStore } from 'pinia'
import { type Ref, ref } from 'vue'
import api from '@/api/index.js'
import type { CreateQuotaDto, QuotaModel, UpdateQuotaStageDto, UpdateQuotaPrivacyDto, QuotaParams } from '@dso-console/shared'

export const useAdminQuotaStore = defineStore('admin-quota', () => {
  const quotas: Ref<Array<QuotaModel>> = ref([])

  const getAllQuotas = async () => {
    quotas.value = await api.getQuotas()
  }

  const getQuotaAssociatedEnvironments = async (quotaId: QuotaParams['quotaId']) => {
    const res = await api.getQuotaAssociatedEnvironments(quotaId)
    return res
  }

  const addQuota = async (quota: CreateQuotaDto) => {
    const res = await api.addQuota(quota)
    return res
  }

  const updateQuotaPrivacy = async (quotaId: QuotaParams['quotaId'], isPrivate: UpdateQuotaPrivacyDto['isPrivate']) => {
    const res = await api.updateQuotaPrivacy(quotaId, { isPrivate })
    return res
  }

  const updateQuotaStage = async (quotaId: QuotaParams['quotaId'], stageIds: UpdateQuotaStageDto['stageIds']) => {
    const res = await api.updateQuotaStage({ quotaId, stageIds })
    return res
  }

  const deleteQuota = async (quotaId: QuotaParams['quotaId']) => {
    const res = await api.deleteQuota(quotaId)
    return res
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
