const createQuotaDto = {
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
  stageIds: {
    type: 'array',
    items: {
      type: 'string',
    },
  },
} as const

export const quotaStageOpenApiSchema = {
  $id: 'quotaStage',
  type: 'object',
  properties: {
    id: {
      type: 'string',
    },
    status: {
      type: 'string',
    },
    quotaId: {
      type: 'string',
    },
    stageId: {
      type: 'string',
    },
    environments: {
      type: 'array',
      items: { $ref: 'environment#' },
    },
    quota: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
        },
        ...createQuotaDto,
        quotaStage: {
          type: 'array',
          items: { $ref: 'quotaStage#' },
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
          items: { $ref: 'quotaStage#' },
        },
      },
    },
  },
} as const

export const quotaOpenApiSchema = {
  $id: 'quota',
  type: 'object',
  properties: {
    ...quotaStageOpenApiSchema.properties.quota.properties,
    quotaStage: {
      type: 'array',
      items: {
        type: quotaStageOpenApiSchema.type,
        properties: quotaStageOpenApiSchema.properties,
      },
    },
  },
} as const

export const quotaParamsSchema = {
  type: 'object',
  properties: {
    quotaId: {
      type: 'string',
    },
  },
} as const

export const getQuotasSchema = {
  description: 'Retrieve quotas',
  tags: ['quota'],
  summary: 'Retrieve quotas, unfiltered list for admin',
  response: {
    200: {
      type: 'array',
      items: quotaOpenApiSchema,
    },
  },
} as const

export const getQuotaAssociatedEnvironmentsSchema = {
  description: 'Retrieve a quota\'s associated environments',
  tags: ['quota', 'environment'],
  summary: 'Retrieve a quota\'s associated environmentsn admin only',
  params: quotaParamsSchema,
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
          stage: {
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

export const createQuotaSchema = {
  description: 'Create a quota',
  tags: ['quota'],
  summary: 'Create a quota, admin only',
  body: {
    type: 'object',
    properties: createQuotaDto,
    required: ['name', 'memory', 'cpu'],
  },
  response: {
    201: quotaOpenApiSchema,
  },
} as const

export const updateQuotaPrivacySchema = {
  description: 'Update a quota\'s privacy',
  tags: ['quota'],
  summary: 'Update a quota\'s privacy, admin only',
  body: {
    type: 'object',
    properties: {
      isPrivate: createQuotaDto.isPrivate,
    },
    required: ['isPrivate'],
  },
  response: {
    200: quotaOpenApiSchema,
  },
} as const

export const updateQuotaStageSchema = {
  description: 'Update a quota\'s association with stages',
  tags: ['quota', 'stage'],
  summary: 'Update a quota\'s association with stages, admin only',
  body: {
    type: 'object',
    properties: {
      quotaId: quotaStageOpenApiSchema.properties.quotaId,
      stageIds: createQuotaDto.stageIds,
      quotaIds: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      stageId: quotaStageOpenApiSchema.properties.quotaId,
    },
    required: [],
  },
  response: {
    200: {
      type: 'array',
      items: quotaStageOpenApiSchema,
    },
  },
} as const

export const deleteQuotaSchema = {
  description: 'Delete a quota',
  tags: ['quota'],
  summary: 'Delete a quota, admin only',
  params: quotaParamsSchema,
  response: {
    204: {},
  },
} as const
