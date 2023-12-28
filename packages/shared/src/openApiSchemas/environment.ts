export const environmentOpenApiSchema = {
  $id: 'environment',
  type: 'object',
  additionalProperties: false,
  properties: {
    id: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    clusterId: {
      type: 'string',
    },
    quotaStageId: {
      type: 'string',
    },
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
  },
} as const
