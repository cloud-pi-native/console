import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateStageSchema,
  GetStageEnvironmentsSchema,
  GetStagesSchema,
  UpdateStageClustersSchema,
  DeleteStageSchema,
} from '../schemas/index.js'

export const stageContract = contractInstance.router({
  getStages: {
    method: 'GET',
    path: `${apiPrefix}/stages`,
    summary: 'Get stages',
    description: 'Retrieved all stages.',
    responses: GetStagesSchema.responses,
  },
})

export const stageAdminContract = contractInstance.router({
  createStage: {
    method: 'POST',
    path: `${apiPrefix}/admin/stages`,
    contentType: 'application/json',
    summary: 'Create stage',
    description: 'Create new stage.',
    body: CreateStageSchema.body,
    responses: CreateStageSchema.responses,
  },

  getStageEnvironments: {
    method: 'GET',
    path: `${apiPrefix}/admin/stages/:stageId/environments`,
    pathParams: GetStageEnvironmentsSchema.params,
    summary: 'Get stages',
    description: 'Retrieved all stages.',
    responses: GetStageEnvironmentsSchema.responses,
  },

  updateStageClusters: {
    method: 'PATCH',
    path: `${apiPrefix}/admin/stages/:stageId/clusters`,
    summary: 'Update stage',
    description: 'Update a stage by its ID.',
    pathParams: UpdateStageClustersSchema.params,
    body: UpdateStageClustersSchema.body,
    responses: UpdateStageClustersSchema.responses,
  },

  deleteStage: {
    method: 'DELETE',
    path: `${apiPrefix}/admin/stages/:stageId`,
    summary: 'Delete stage',
    description: 'Delete a stage by its ID.',
    pathParams: DeleteStageSchema.params,
    body: null,
    responses: DeleteStageSchema.responses,
  },
})
