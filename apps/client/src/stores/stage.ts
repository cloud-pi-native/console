import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  type CreateStageBody,
  type Stage,
  type UpdateStageBody,
  resourceListToDict,
} from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useStageStore = defineStore('stage', () => {
  const stages = ref<Stage[]>([])
  const stagesById = computed(() => resourceListToDict(stages.value))

  const getAllStages = async () => {
    stages.value = await apiClient.Stages.getStages()
      .then(response => extractData(response, 200))
    return stages.value
  }

  const getStageAssociatedEnvironments = (stageId: string) =>
    apiClient.StagesAdmin.getStageEnvironments({ params: { stageId } })
      .then(response => extractData(response, 200))

  const addStage = (body: CreateStageBody) =>
    apiClient.StagesAdmin.createStage({ body })
      .then(response => extractData(response, 201))

  const updateStage = (stageId: string, body: UpdateStageBody) =>
    apiClient.StagesAdmin.updateStage({ params: { stageId }, body })
      .then(response => extractData(response, 200))

  const deleteStage = (stageId: string) =>
    apiClient.StagesAdmin.deleteStage({ params: { stageId } })
      .then(response => extractData(response, 204))

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
