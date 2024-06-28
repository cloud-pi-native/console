import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CreateStageBody, Stage, UpdateQuotaStageBody, UpdateStageClustersBody } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useStageStore = defineStore('stage', () => {
  const stages = ref<Stage[]>([])

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

  const updateQuotaStage = (stageId: string, quotaIds: UpdateQuotaStageBody['quotaIds']) =>
    apiClient.QuotasAdmin.updateQuotaStage({ body: { stageId, quotaIds } })
      .then(response => extractData(response, 200))

  const updateStageClusters = (stageId: string, clusterIds: UpdateStageClustersBody['clusterIds']) =>
    apiClient.StagesAdmin.updateStageClusters({ body: { clusterIds }, params: { stageId } })
      .then(response => extractData(response, 200))

  const deleteStage = (stageId: string) =>
    apiClient.StagesAdmin.deleteStage({ params: { stageId } })
      .then(response => extractData(response, 204))

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
