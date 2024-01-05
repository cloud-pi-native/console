export const serviceOpenApiSchema = {
  $id: 'service',
  type: 'object',
  additionalProperties: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
      },
      to: {
        type: 'string',
      },
      monitorUrl: {
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
} as const

export const createProjectDto = {
  name: {
    type: 'string',
  },
  organizationId: {
    type: 'string',
  },
  description: {
    type: 'string',
  },
} as const

export const projectOpenApiSchema = {
  $id: 'project',
  type: 'object',
  additionalProperties: false,
  properties: {
    id: {
      type: 'string',
    },
    ...createProjectDto,
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
    organization: { $ref: 'organization#' },
    services: { $ref: 'service#' },
    environments: {
      type: 'array',
      items: { $ref: 'environment#' },
    },
    repositories: {
      type: 'array',
      items: { $ref: 'repository#' },
    },
    roles: {
      type: 'array',
      items: { $ref: 'role#' },
    },
    clusters: {
      type: 'array',
      items: { $ref: 'cluster#' },
    },
  },
  required: ['id', 'organizationId', 'locked', 'status', 'name'],
} as const

const projectParamsSchema = {
  type: 'object',
  properties: {
    projectId: {
      type: 'string',
    },
  },
  required: ['projectId'],
} as const

export const getProjectsSchema = {
  description: 'Retrieve a user\'s projects',
  tags: ['project'],
  summary: 'Retrieve a user\'s projects with further informations',
  query: {
    type: 'object',
    properties: {
      filter: {
        enum: ['admin', 'user', ''],
      },
    },
  },
  response: {
    200: {
      type: 'array',
      items: {
        allOf: [
          { $ref: 'project#' },
          {
            type: 'object',
            properties: {
              roles: {
                type: 'array',
                items: { $ref: 'role#' },
              },
            },
          }],
      },
    },
  },
} as const

export const getProjectByIdSchema = {
  description: 'Retrieve a project by its id',
  tags: ['project'],
  summary: 'Retrieve a project by its id, with further informations',
  params: projectParamsSchema,
  response: {
    200: { $ref: 'project#' },
  },
} as const

export const getProjectSecretsSchema = {
  description: 'Retrieve a project secrets by its id',
  tags: ['project'],
  summary: 'Retrieve a project secrets by its id, owner only',
  params: projectParamsSchema,
  response: {
    200: {
      example: 'La réponse dépend du plugin utilisé',
      type: 'object',
      patternProperties: {
        '^.*$': {
          anyOf: [
            { type: 'string' },
            { type: 'null' },
            { type: 'object' },
          ],
        },
      },
      additionalProperties: {
        type: 'object',
        patternProperties: {
          '^.*$': {
            anyOf: [
              { type: 'string' },
              { type: 'null' },
              { type: 'object' },
            ],
          },
        },
      },
    },
  },
} as const

export const getAllProjectsSchema = {
  description: 'Retrieve all projects',
  tags: ['project'],
  summary: 'Retrieve all projects, admin only',
  response: {
    200: {
      type: 'array',
      items: {
        allOf: [
          { $ref: 'project#' },
          {
            type: 'object',
            properties: {
              roles: {
                type: 'array',
                items: {
                  allOf: [
                    { $ref: 'role#' },
                    {
                      type: 'object',
                      properties: {
                        user: { $ref: 'user#' },
                      },
                    },
                  ],
                },
              },
              environments: {
                type: 'array',
                items: {
                  allOf: [
                    { $ref: 'environment#' },
                    {
                      type: 'object',
                      properties: {
                        permissions: {
                          type: 'array',
                          items: {
                            allOf: [
                              { $ref: 'permission#' },
                              {
                                type: 'object',
                                properties: {
                                  user: { $ref: 'user#' },
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          }],
        required: [
          'id',
          'status',
          'locked',
          'name',
        ],
      },
    },
  },
} as const

export const generateProjectsDataSchema = {
  description: 'Retrieve all projects data for download as CSV file',
  tags: ['project'],
  summary: 'Retrieve all projects data for download as CSV file, admin only',
  response: {
    200: {
      type: 'string',
    },
  },
} as const

export const createProjectSchema = {
  description: 'Create a new project',
  tags: ['project'],
  summary: 'Create a new project',
  body: {
    type: 'object',
    properties: createProjectDto,
    required: ['organizationId', 'name'],
    additionalProperties: false,
  },
  response: {
    201: { $ref: 'project#' },
  },
} as const

export const updateProjectSchema = {
  description: 'Update project',
  tags: ['project'],
  summary: 'Update a project',
  params: projectParamsSchema,
  body: {
    type: 'object',
    properties: {
      description: createProjectDto.description,
    },
  },
  response: {
    200: { $ref: 'project#' },
  },
} as const

export const patchProjectSchema = {
  description: 'Patch project (lock/unlock)',
  tags: ['project'],
  summary: 'Patch a project',
  params: projectParamsSchema,
  body: {
    type: 'object',
    properties: {
      lock: { type: 'boolean' },
    },
  },
  response: {
    200: {},
  },
} as const

export const archiveProjectSchema = {
  description: 'Archive a project',
  tags: ['project'],
  summary: 'Archive a project',
  params: projectParamsSchema,
  response: {
    204: {},
  },
} as const
