export const serviceOpenApiSchema = {
  $id: 'services',
  type: 'object',
  additionalProperties: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
      },
      name: {
        type: 'string',
      },
      title: {
        type: 'string',
      },
      imgSrc: {
        type: 'string',
      },
      description: {
        type: 'string',
      },
    },
  },
  required: [
  ],
} as const

export const projectOpenApiSchema = {
  $id: 'project',
  type: 'object',
  additionalProperties: false,
  properties: {
    id: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    organizationId: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    status: {
      enum: ['initializing', 'created', 'failed', 'archived'],
    },
    locked: {
      type: 'boolean',
    },
    createdAt: {
      type: 'string',
    },
    updatedAt: {
      type: 'string',
    },
  },
} as const
