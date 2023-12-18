import { permissionOpenApiSchema } from '../../openApiSchemas/permission.js'

export const setPermissionDto = {
  userId: {
    type: 'string',
  },
  level: {
    type: 'number',
  },
} as const

const permissionParamsSchema = {
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

export const getEnvironmentPermissionsSchema = {
  description: 'Retrieve permissions for a given environment',
  tags: ['permission'],
  summary: 'Retrieve permissions for a given environment',
  params: permissionParamsSchema,
  response: {
    200: {
      type: 'array',
      items: permissionOpenApiSchema,
    },
  },
} as const

export const setPermissionSchema = {
  description: 'Create a new permission',
  tags: ['permission'],
  summary: 'Create a new permission',
  params: permissionParamsSchema,
  body: {
    type: 'object',
    properties: setPermissionDto,
    required: ['userId', 'level'],
    // required: Object.keys(setPermissionDto),
  },
  response: {
    201: permissionOpenApiSchema,
  },
} as const

export const updatePermissionSchema = {
  description: 'Update a permission',
  tags: ['permission'],
  summary: 'Update a permission',
  params: permissionParamsSchema,
  body: {
    type: 'object',
    properties: setPermissionDto,
  },
  response: {
    200: permissionOpenApiSchema,
  },
} as const

export const deletePermissionSchema = {
  description: 'Archive a permission',
  tags: ['permission'],
  summary: 'Archive a permission',
  params: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
      },
      environmentId: {
        type: 'string',
      },
      userId: {
        type: 'string',
      },
    },
    required: ['projectId', 'environmentId', 'userId'],
  },
  response: {
    204: {},
  },
} as const
