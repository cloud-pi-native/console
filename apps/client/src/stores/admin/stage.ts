import { defineStore } from 'pinia'
import { type Ref, ref } from 'vue'
import api from '@/api/index.js'
import type { CreateStageDto, StageModel, StageParams, UpdateQuotaStageDto, UpdateStageClustersDto } from '@dso-console/shared'

export const useAdminStageStore = defineStore('admin-stage', () => {
  const stages: Ref<Array<StageModel>> = ref([])

  const getAllStages = async () => {
    stages.value = await api.getStages()
  }

  const getStageAssociatedEnvironments = async (stageId: StageParams['stageId']) => {
    const res = await api.getStageAssociatedEnvironments(stageId)
    return res
  }

  const addStage = async (stage: CreateStageDto) => {
    const res = await api.addStage(stage)
    return res
  }

  const updateQuotaStage = async (stageId: StageParams['stageId'], quotaIds: UpdateQuotaStageDto['quotaIds']) => {
    const res = await api.updateQuotaStage({ stageId, quotaIds })
    return res
  }

  const updateStageClusters = async (stageId: StageParams['stageId'], clusterIds: UpdateStageClustersDto['clusterIds']) => {
    const res = await api.updateStageClusters(stageId, { clusterIds })
    return res
  }

  const deleteStage = async (stageId: StageParams['stageId']) => {
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
