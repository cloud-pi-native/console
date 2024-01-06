import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/api/xhr-client.js'
import type { CreateStageDto, StageModel, UpdateQuotaStageDto, UpdateStageClustersDto } from '@dso-console/shared'

export const useAdminStageStore = defineStore('admin-stage', () => {
  const stages = ref<StageModel[]>([])

  const getAllStages = async () => {
    // @ts-ignore
    stages.value = (await apiClient.v1StagesList()).data
  }

  const getStageAssociatedEnvironments = async (stageId: string) => {
    return (await apiClient.v1AdminStagesEnvironmentsDetail(stageId)).data
  }

  const addStage = async (stage: CreateStageDto) => {
    return (await apiClient.v1AdminStagesCreate(stage)).data
  }

  const updateQuotaStage = async (stageId: string, quotaIds: UpdateQuotaStageDto['quotaIds']) => {
    return (await apiClient.v1AdminQuotasQuotastagesUpdate({ stageId, quotaIds })).data
  }

  const updateStageClusters = async (stageId: string, clusterIds: UpdateStageClustersDto['clusterIds']) => {
    return (await apiClient.v1AdminStagesClustersPartialUpdate(stageId, { clusterIds })).data
  }

  const deleteStage = async (stageId: string) => {
    return (await apiClient.v1AdminStagesDelete(stageId)).data
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
