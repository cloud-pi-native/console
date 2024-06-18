import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/index.js'
import type { CreateQuotaBody, Quota, ResourceById, UpdateQuotaBody } from '@cpn-console/shared'

export const useAdminQuotaStore = defineStore('admin-quota', () => {
  const quotas = ref<Quota[]>([])
  const quotasById = computed<ResourceById<Quota>>(() => quotas.value.reduce((acc, curr) => {
    acc[curr.id] = curr
    return acc
  }, {} as ResourceById<Quota>))

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
  const updateQuota = async (quotaId: string, data: UpdateQuotaBody) => {
    const res = await api.updateQuota(quotaId, data)
    return res
  }

  const deleteQuota = async (quotaId: string) => {
    const res = await api.deleteQuota(quotaId)
    return res
  }

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
