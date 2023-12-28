export const stageOpenApiSchema = {
  $id: 'stage',
  type: 'object',
  additionalProperties: false,
  properties: {
    id: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
  },
} as const
