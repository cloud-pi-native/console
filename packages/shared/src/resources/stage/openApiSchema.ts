import { quotaStageOpenApiSchema } from '../quota/openApiSchema.js'

export const stageOpenApiSchema = {
  $id: 'stage',
  type: 'object',
  properties: {
    ...quotaStageOpenApiSchema.properties.stage.properties,
    quotaStage: {
      type: 'array',
      items: { $ref: 'quotaStage#' },
    },
  },
} as const

const createStageDto = {
  name: stageOpenApiSchema.properties.name,
  quotaIds: {
    type: 'array',
    items: {
      type: 'string',
    },
  },
  clusterIds: {
    type: 'array',
    items: {
      type: 'string',
    },
  },
  clusters: {
    type: 'array',
    items: { $ref: 'cluster#' },
  },
} as const

export const stageParamsSchema = {
  type: 'object',
  properties: {
    stageId: {
      type: 'string',
    },
  },
} as const

export const getStagesSchema = {
  description: 'Retrieve stages',
  tags: ['stage'],
  summary: 'Retrieve stages, unfiltered list for admin',
  response: {
    200: {
      type: 'array',
      items: { $ref: 'stage#' },
    },
  },
} as const

export const getStageAssociatedEnvironmentsSchema = {
  description: 'Retrieve a stage\'s associated environments',
  tags: ['stage', 'environment'],
  summary: 'Retrieve a stage\'s associated environments, admin only',
  params: stageParamsSchema,
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          organization: {
            type: 'string',
          },
          project: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          quota: {
            type: 'string',
          },
          cluster: {
            type: 'string',
          },
          owner: {
            type: 'string',
          },
        },
      },
    },
  },
} as const

export const createStageSchema = {
  description: 'Create a stage',
  tags: ['stage'],
  summary: 'Create a stage, admin only',
  body: {
    type: 'object',
    properties: createStageDto,
    required: ['name'],
  },
  response: {
    200: { $ref: 'stage#' },
  },
} as const

export const updateStageClustersSchema = {
  description: 'Update a stage\'s associated clusters',
  tags: ['stage'],
  summary: 'Update a stage\'s associated clusters, admin only',
  params: stageParamsSchema,
  body: {
    type: 'object',
    properties: {
      clusterIds: createStageDto.clusterIds,
    },
    required: ['clusterIds'],
  },
  response: {
    200: {
      type: 'array',
      items: {
        $ref: 'cluster#',
      },
    },
  },
} as const

export const deleteStageSchema = {
  description: 'Delete a stage',
  tags: ['stage'],
  summary: 'Delete a stage, admin only',
  params: stageParamsSchema,
  response: {
    204: {},
  },
} as const
