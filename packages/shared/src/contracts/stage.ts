import { ClientInferRequest, ClientInferResponseBody } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateStageSchema,
  GetStageEnvironmentsSchema,
  GetStagesSchema,
  UpdateStageSchema,
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

  updateStage: {
    method: 'PATCH',
    path: `${apiPrefix}/admin/stages/:stageId`,
    summary: 'Update stage',
    description: 'Update a stage by its ID.',
    pathParams: UpdateStageSchema.params,
    body: UpdateStageSchema.body,
    responses: UpdateStageSchema.responses,
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

export type CreateStageBody = ClientInferRequest<typeof stageAdminContract.createStage>['body']

export type UpdateStageBody = ClientInferRequest<typeof stageAdminContract.updateStage>['body']

export type StageAssociatedEnvironments = ClientInferResponseBody<typeof stageAdminContract.getStageEnvironments, 200>
