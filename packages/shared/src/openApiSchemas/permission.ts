export const permissionOpenApiSchema = {
  $id: 'permission',
  type: 'object',
  additionalProperties: false,
  properties: {
    id: {
      type: 'string',
    },
    environmentId: {
      type: 'string',
    },
    createdAt: {
      type: 'string',
    },
    updatedAt: {
      type: 'string',
    },
    userId: {
      type: 'string',
    },
    level: {
      type: 'number',
    },
  },
} as const
