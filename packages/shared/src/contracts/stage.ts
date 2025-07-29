import type { ClientInferRequest, ClientInferResponseBody } from '@ts-rest/core'
import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client'
import { StageSchema } from '../schemas/index'
import { ErrorSchema, baseHeaders } from './_utils'

export const stageContract = contractInstance.router({
  listStages: {
    method: 'GET',
    path: '',
    summary: 'Get stages',
    description: 'Retrieved all stages.',
    responses: {
      200: StageSchema.array(),
      500: ErrorSchema,
    },
  },

  createStage: {
    method: 'POST',
    path: '',
    contentType: 'application/json',
    summary: 'Create stage',
    description: 'Create new stage.',
    body: StageSchema.omit({ id: true }).partial({ clusterIds: true, quotaIds: true }),
    responses: {
      201: StageSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema,
    },
  },

  getStageEnvironments: {
    method: 'GET',
    path: `/:stageId/environments`,
    summary: 'Get stages',
    description: 'Retrieved all stages.',
    pathParams: z.object({
      stageId: z.string()
        .uuid(),
    }),
    responses: {
      200: z.array(z.object({
        project: z.string(),
        name: z.string(),
        quota: z.string(),
        cluster: z.string(),
        owner: z.string().optional(),
      })),
      500: ErrorSchema,
    },
  },

  updateStage: {
    method: 'PUT',
    path: `/:stageId`,
    summary: 'Update stage',
    description: 'Update a stage by its ID.',
    pathParams: z.object({
      stageId: z.string()
        .uuid(),
    }),
    body: StageSchema.pick({ clusterIds: true, name: true, quotaIds: true }).partial(),
    responses: {
      200: StageSchema,
      500: ErrorSchema,
    },
  },

  deleteStage: {
    method: 'DELETE',
    path: `/:stageId`,
    summary: 'Delete stage',
    description: 'Delete a stage by its ID.',
    body: null,
    pathParams: z.object({
      stageId: z.string()
        .uuid(),
    }),
    responses: {
      204: null,
      500: ErrorSchema,
    },
  },
}, {
  baseHeaders,
  pathPrefix: `${apiPrefix}/stages`,
})

export type CreateStageBody = ClientInferRequest<typeof stageContract.createStage>['body']

export type UpdateStageBody = ClientInferRequest<typeof stageContract.updateStage>['body']

export type StageAssociatedEnvironments = ClientInferResponseBody<typeof stageContract.getStageEnvironments, 200>
