export const userOpenApiSchema = {
  $id: 'user',
  type: 'object',
  additionalProperties: false,
  properties: {
    id: {
      type: 'string',
    },
    firstName: {
      type: 'string',
    },
    lastName: {
      type: 'string',
    },
    email: {
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

export const roleOpenApiSchema = {
  $id: 'role',
  type: 'object',
  additionalProperties: false,
  properties: {
    userId: {
      type: 'string',
    },
    projectId: {
      type: 'string',
    },
    role: {
      enum: ['owner', 'user'],
    },
    createdAt: {
      type: 'string',
    },
    updatedAt: {
      type: 'string',
    },
  },
  required: ['userId', 'projectId', 'role'],
} as const
