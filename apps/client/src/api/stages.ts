import type { CreateStageBody, UpdateStageBody } from '@cpn-console/shared'
import { apiClient, extractData } from './xhr-client.js'

export const getStages = async () =>
  apiClient.Stages.getStages()
    .then(response => extractData(response, 200))

// Admin
export const getStageAssociatedEnvironments = async (stageId: string) =>
  apiClient.StagesAdmin.getStageEnvironments({ params: { stageId } })
    .then(response => extractData(response, 200))

export const addStage = async (data: CreateStageBody) =>
  apiClient.StagesAdmin.createStage({ body: data })
    .then(response => extractData(response, 201))

export const updateStage = async (stageId: string, data: UpdateStageBody) =>
  apiClient.StagesAdmin.updateStage({ body: data, params: { stageId } })
    .then(response => extractData(response, 200))

export const deleteStage = async (stageId: string) =>
  apiClient.StagesAdmin.deleteStage({ params: { stageId } })
    .then(response => extractData(response, 204))
