export const organizationOpenApiSchema = {
  $id: 'organization',
  type: 'object',
  additionalProperties: false,
  properties: {
    id: {
      type: 'string',
    },
    active: {
      type: 'boolean',
    },
    createdAt: {
      type: 'string',
    },
    updatedAt: {
      type: 'string',
    },
    source: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    label: {
      type: 'string',
    },
  },
} as const
