export const quotaStageOpenApiSchema = {
  $id: 'quotaStage',
  type: 'object',
  additionalProperties: false,
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
  },
} as const

export const quotaOpenApiSchema = {
  $id: 'quota',
  type: 'object',
  additionalProperties: false,
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
  },
} as const
