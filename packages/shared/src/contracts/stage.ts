import { ClientInferRequest, ClientInferResponseBody } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateStageSchema,
  GetStageEnvironmentsSchema,
  ListStagesSchema,
  UpdateStageSchema,
  DeleteStageSchema,
} from '../schemas/index.js'

export const stageContract = contractInstance.router({
  listStages: {
    method: 'GET',
    path: `${apiPrefix}/stages`,
    summary: 'Get stages',
    description: 'Retrieved all stages.',
    responses: ListStagesSchema.responses,
  },

  createStage: {
    method: 'POST',
    path: `${apiPrefix}/stages`,
    contentType: 'application/json',
    summary: 'Create stage',
    description: 'Create new stage.',
    body: CreateStageSchema.body,
    responses: CreateStageSchema.responses,
  },

  getStageEnvironments: {
    method: 'GET',
    path: `${apiPrefix}/stages/:stageId/environments`,
    pathParams: GetStageEnvironmentsSchema.params,
    summary: 'Get stages',
    description: 'Retrieved all stages.',
    responses: GetStageEnvironmentsSchema.responses,
  },

  updateStage: {
    method: 'PUT',
    path: `${apiPrefix}/stages/:stageId`,
    summary: 'Update stage',
    description: 'Update a stage by its ID.',
    pathParams: UpdateStageSchema.params,
    body: UpdateStageSchema.body,
    responses: UpdateStageSchema.responses,
  },

  deleteStage: {
    method: 'DELETE',
    path: `${apiPrefix}/stages/:stageId`,
    summary: 'Delete stage',
    description: 'Delete a stage by its ID.',
    pathParams: DeleteStageSchema.params,
    body: null,
    responses: DeleteStageSchema.responses,
  },
})

export type CreateStageBody = ClientInferRequest<typeof stageContract.createStage>['body']

export type UpdateStageBody = ClientInferRequest<typeof stageContract.updateStage>['body']

export type StageAssociatedEnvironments = ClientInferResponseBody<typeof stageContract.getStageEnvironments, 200>
