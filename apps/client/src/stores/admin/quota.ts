import { defineStore } from 'pinia'
import { type Ref, ref } from 'vue'
import api from '@/api/index.js'
import type { CreateQuotaDto, QuotaModel, DeleteQuotaDto, UpdateQuotaStageDto, UpdateQuotaPrivacyDto } from '@dso-console/shared'

export const useAdminQuotaStore = defineStore('admin-quota', () => {
  const quotas: Ref<Array<QuotaModel>> = ref([])

  const getAllQuotas = async () => {
    quotas.value = await api.getQuotas()
  }

  const getQuotaAssociatedEnvironments = async (quotaId: DeleteQuotaDto['params']['quotaId']) => {
    const res = await api.getQuotaAssociatedEnvironments(quotaId)
    return res
  }

  const addQuota = async (quota: CreateQuotaDto['body']) => {
    const res = await api.addQuota(quota)
    return res
  }

  const updateQuotaPrivacy = async (quotaId: UpdateQuotaPrivacyDto['params']['quotaId'], isPrivate: UpdateQuotaPrivacyDto['body']['isPrivate']) => {
    const res = await api.updateQuotaPrivacy(quotaId, { isPrivate })
    return res
  }

  const updateQuotaStage = async (quotaId: UpdateQuotaStageDto['body']['quotaId'], stageIds: UpdateQuotaStageDto['body']['stageIds']) => {
    const res = await api.updateQuotaStage({ quotaId, stageIds })
    return res
  }

  const deleteQuota = async (quotaId: DeleteQuotaDto['params']['quotaId']) => {
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
