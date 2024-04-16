import type { CreateStageBody, UpdateStageClustersBody } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

export const getStages = async () => {
  const response = await apiClient.Stages.getStages()
  if (response.status === 200) return response.body
}

// Admin
export const getStageAssociatedEnvironments = async (stageId: string) => {
  const response = await apiClient.StagesAdmin.getStageEnvironments({ params: { stageId } })
  if (response.status === 200) return response.body
}

export const addStage = async (data: CreateStageBody) => {
  const response = await apiClient.StagesAdmin.createStage({ body: data })
  if (response.status === 201) return response.body
}

export const updateStageClusters = async (stageId: string, data: UpdateStageClustersBody) => {
  const response = await apiClient.StagesAdmin.updateStageClusters({ body: data, params: { stageId } })
  if (response.status === 200) return response.body
}

export const deleteStage = async (stageId: string) => {
  const response = await apiClient.StagesAdmin.deleteStage({ params: { stageId } })
  if (response.status === 204) return response.body
}
