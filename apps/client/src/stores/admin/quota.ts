import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/index.js'
import type { CreateQuotaBody, Quota, UpdateQuotaStageBody, PatchQuotaBody } from '@cpn-console/shared'

export const useAdminQuotaStore = defineStore('admin-quota', () => {
  const quotas = ref<Quota[]>([])

  const getAllQuotas = async () => {
    quotas.value = await api.getQuotas()
  }

  const getQuotaAssociatedEnvironments = async (quotaId: string) => {
    const res = await api.getQuotaAssociatedEnvironments(quotaId)
    return res
  }

  const addQuota = async (quota: CreateQuotaBody) => {
    const res = await api.addQuota(quota)
    return res
  }

  const updateQuotaPrivacy = async (quotaId: string, isPrivate: PatchQuotaBody['isPrivate']) => {
    const res = await api.updateQuotaPrivacy(quotaId, { isPrivate })
    return res
  }

  const updateQuotaStage = async (quotaId: string, stageIds: UpdateQuotaStageBody['stageIds']) => {
    const res = await api.updateQuotaStage({ quotaId, stageIds })
    return res
  }

  const deleteQuota = async (quotaId: string) => {
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
