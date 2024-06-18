import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/index.js'
import { resourceListToDict, type CreateStageBody, type ResourceById, type Stage, type UpdateStageBody } from '@cpn-console/shared'

export const useAdminStageStore = defineStore('admin-stage', () => {
  const stages = ref<Stage[]>([])
  let stagesById: ResourceById<Stage> = {}

  const getAllStages = async () => {
    const res = await api.getStages()
    stages.value = res
    stagesById = resourceListToDict(stages.value)
  }

  const getStageAssociatedEnvironments = async (stageId: string) => {
    const res = await api.getStageAssociatedEnvironments(stageId)
    return res
  }

  const addStage = async (stage: CreateStageBody) => api.addStage(stage)

  const updateStage = async (stageId: string, data: UpdateStageBody) => api.updateStage(stageId, data)

  const deleteStage = async (stageId: string) => api.deleteStage(stageId)

  return {
    stages,
    stagesById,
    getAllStages,
    getStageAssociatedEnvironments,
    addStage,
    updateStage,
    deleteStage,
  }
})
