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
    stages.value = await apiClient.Stages.listStages()
      .then((response: any) => extractData(response, 200))
    return stages.value
  }

  const getStageAssociatedEnvironments = (stageId: string) =>
    apiClient.Stages.getStageEnvironments({ params: { stageId } })
      .then((response: any) => extractData(response, 200))

  const addStage = (body: CreateStageBody) =>
    apiClient.Stages.createStage({ body })
      .then((response: any) => extractData(response, 201))

  const updateStage = (stageId: string, body: UpdateStageBody) =>
    apiClient.Stages.updateStage({ params: { stageId }, body })
      .then((response: any) => extractData(response, 200))

  const deleteStage = (stageId: string) =>
    apiClient.Stages.deleteStage({ params: { stageId } })
      .then((response: any) => extractData(response, 204))

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
