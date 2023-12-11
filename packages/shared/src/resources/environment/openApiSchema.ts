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

export const environmentOpenApiSchema = {
  $id: 'environment',
  type: 'object',
  properties: {
    id: {
      type: 'string',
    },
    ...initializeEnvironmentDto,
    projectId: {
      type: 'string',
    },
    status: {
      type: 'string',
    },
    createdAt: {
      type: 'string',
    },
    updatedAt: {
      type: 'string',
    },
    permissions: {
      type: 'array',
      items: { $ref: 'permission#' },
    },
    cluster: { $ref: 'cluster#' },
    project: { $ref: 'project#' },
    quotaStage: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
        },
        quotaId: {
          type: 'string',
        },
        stageId: {
          type: 'string',
        },
        status: {
          type: 'string',
        },
        environments: {
          type: 'array',
          items: { type: 'object' },
        },
        quota: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            memory: {
              type: 'string',
            },
            cpu: {
              type: 'number',
            },
            isPrivate: {
              type: 'boolean',
            },
            quotaStage: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                  },
                  quotaId: {
                    type: 'string',
                  },
                  stageId: {
                    type: 'string',
                  },
                  status: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        stage: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            clusters: {
              type: 'array',
              items: { $ref: 'cluster#' },
            },
            quotaStage: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                  },
                  quotaId: {
                    type: 'string',
                  },
                  stageId: {
                    type: 'string',
                  },
                  status: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
      // type: quotaStageSchema,
    },
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
