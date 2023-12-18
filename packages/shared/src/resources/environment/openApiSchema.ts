import { environmentOpenApiSchema } from '../../openApiSchemas/environment.js'

export const initializeEnvironmentDto = {
  name: {
    type: 'string',
  },
  clusterId: {
    type: 'string',
  },
  quotaStageId: {
    type: 'string',
  },
} as const

const environmentParamsSchema = {
  type: 'object',
  properties: {
    projectId: {
      type: 'string',
    },
    environmentId: {
      type: 'string',
    },
  },
  required: ['projectId', 'environmentId'],
} as const

export const getEnvironmentByIdSchema = {
  description: 'Retrieve an environment by its id',
  tags: ['environment'],
  summary: 'Retrieve an environment by its id',
  params: environmentParamsSchema,
  response: {
    200: environmentOpenApiSchema,
  },
} as const

// TODO : typage perdu dans DTO avec required dynamique, IIFE pas appliquable
export const initializeEnvironmentSchema = {
  description: 'Create a new environment',
  tags: ['environment'],
  summary: 'Create a new environment',
  params: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
      },
    },
    required: ['projectId'],
  },
  body: {
    type: 'object',
    properties: initializeEnvironmentDto,
    required: ['name', 'clusterId', 'quotaStageId'],
    // required: Object.keys(initializeEnvironmentDto),
  },
  response: {
    201: environmentOpenApiSchema,
  },
} as const

export const updateEnvironmentSchema = {
  description: 'Update an environment',
  tags: ['environment'],
  summary: 'Update an environment',
  params: environmentParamsSchema,
  body: {
    type: 'object',
    properties: {
      quotaStageId: initializeEnvironmentDto.quotaStageId,
      clusterId: initializeEnvironmentDto.clusterId,
    },
  },
  response: {
    200: environmentOpenApiSchema,
  },
} as const

export const deleteEnvironmentSchema = {
  description: 'Archive an environment',
  tags: ['environment'],
  summary: 'Archive an environment',
  params: environmentParamsSchema,
  response: {
    204: {},
  },
} as const
