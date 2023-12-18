import { roleOpenApiSchema, userOpenApiSchema } from '../../openApiSchemas/user.js'

const userParamsSchema = {
  type: 'object',
  properties: {
    projectId: {
      type: 'string',
    },
  },
  required: ['projectId'],
} as const

const roleParamsSchema = {
  type: 'object',
  properties: {
    projectId: {
      type: 'string',
    },
    userId: {
      type: 'string',
    },
  },
  required: ['projectId', 'userId'],
} as const

export const getUsersSchema = {
  description: 'Retrieve all users',
  tags: ['user'],
  summary: 'Retrieve all users, admin only',
  response: {
    200: {
      type: 'array',
      items: userOpenApiSchema,
    },
  },
} as const
export const getProjectUsersSchema = {
  description: 'Retrieve a project\'s users',
  tags: ['user'],
  summary: 'Retrieve a project\'s users',
  params: userParamsSchema,
  response: {
    200: {
      type: 'array',
      items: {
        allOf: [
          { $ref: 'user#' },
          {
            type: 'object',
            properties: {
              role: { $ref: 'role#' },
            },
            required: ['role'],
          },
        ],
      },
    },
  },
} as const

export const getMatchingUsersSchema = {
  description: 'Retrieve users whose email matches given letters',
  tags: ['user'],
  summary: 'Retrieve users whose email matches given letters',
  params: userParamsSchema,
  query: {
    type: 'object',
    properties: {
      letters: {
        type: 'string',
      },
    },
    required: ['letters'],
  },
  response: {
    200: {
      type: 'array',
      items: userOpenApiSchema,
    },
  },
} as const

export const addUserToProjectSchema = {
  description: 'Add user to a project team',
  tags: ['user'],
  summary: 'Add user to a project team',
  params: userParamsSchema,
  body: {
    type: 'object',
    properties: {
      email: userOpenApiSchema.properties.email,
    },
    required: ['email'],
  },
  response: {
    201: {
      type: 'string',
    },
  },
} as const

export const updateUserProjectRoleSchema = {
  description: 'Update user role in a project team',
  tags: ['user'],
  summary: 'Update user role in a project team',
  params: roleParamsSchema,
  body: {
    type: 'object',
    properties: {
      role: roleOpenApiSchema.properties.role,
    },
    required: [],
  },
  response: {
    200: {
      type: 'string',
    },
  },
} as const

export const removeUserFromProjectSchema = {
  description: 'Remove user from a project team',
  tags: ['user'],
  summary: 'Remove user from a project team',
  params: roleParamsSchema,
  response: {
    200: {
      type: 'string',
    },
  },
} as const
