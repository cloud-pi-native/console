import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/index.js'
import type { CreateStageBody, Stage, UpdateQuotaStageBody, UpdateStageClustersBody } from '@cpn-console/shared'

export const useAdminStageStore = defineStore('admin-stage', () => {
  const stages = ref<Stage[]>()

  const getAllStages = async () => {
    stages.value = await api.getStages()
  }

  const getStageAssociatedEnvironments = async (stageId: string) => {
    const res = await api.getStageAssociatedEnvironments(stageId)
    return res
  }

  const addStage = async (stage: CreateStageBody) => {
    const res = await api.addStage(stage)
    return res
  }

  const updateQuotaStage = async (stageId: string, quotaIds: UpdateQuotaStageBody['quotaIds']) => {
    const res = await api.updateQuotaStage({ stageId, quotaIds })
    return res
  }

  const updateStageClusters = async (stageId: string, clusterIds: UpdateStageClustersBody['clusterIds']) => {
    const res = await api.updateStageClusters(stageId, { clusterIds })
    return res
  }

  const deleteStage = async (stageId: string) => {
    const res = await api.deleteStage(stageId)
    return res
  }

  return {
    stages,
    getAllStages,
    getStageAssociatedEnvironments,
    addStage,
    updateQuotaStage,
    updateStageClusters,
    deleteStage,
  }
})
