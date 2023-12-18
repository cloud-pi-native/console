import { nonSensitiveClusterOpenApiSchema } from '../../openApiSchemas/cluster.js'
import { environmentOpenApiSchema } from '../../openApiSchemas/environment.js'
import { organizationOpenApiSchema } from '../../openApiSchemas/organization.js'
import { permissionOpenApiSchema } from '../../openApiSchemas/permission.js'
import { projectOpenApiSchema } from '../../openApiSchemas/project.js'
import { quotaOpenApiSchema, quotaStageOpenApiSchema } from '../../openApiSchemas/quota.js'
import { repositoryOpenApiSchema } from '../../openApiSchemas/repository.js'
import { stageOpenApiSchema } from '../../openApiSchemas/stage.js'
import { roleOpenApiSchema, userOpenApiSchema } from '../../openApiSchemas/user.js'

const clusterWithStages = {
  ...nonSensitiveClusterOpenApiSchema,
  properties: {
    ...nonSensitiveClusterOpenApiSchema.properties,
    stages: {
      type: 'array',
      items: { $ref: 'stage#' },
    },
  },
}

const fullProjectInfosSchema = {
  ...projectOpenApiSchema,
  properties: {
    ...projectOpenApiSchema.properties,
    clusters: {
      type: 'array',
      items: clusterWithStages,
    },
    services: { $ref: 'services#' },
    environments: {
      type: 'array',
      items: {
        ...environmentOpenApiSchema,
        properties: {
          ...environmentOpenApiSchema.properties,
          permissions: {
            type: 'array',
            items: {
              ...permissionOpenApiSchema,
              properties: {
                ...permissionOpenApiSchema.properties,
                user: userOpenApiSchema,
              },
            },
          },
          cluster: clusterWithStages,
          quotaStage: {
            ...quotaStageOpenApiSchema,
            properties: {
              ...quotaStageOpenApiSchema.properties,
              quota: quotaOpenApiSchema,
              stage: stageOpenApiSchema,
            },
          },
        },
      },
    },
    repositories: {
      type: 'array',
      items: repositoryOpenApiSchema,
    },
    organization: organizationOpenApiSchema,
    roles: {
      type: 'array',
      items: {
        ...roleOpenApiSchema,
        properties: {
          ...roleOpenApiSchema.properties,
          user: { $ref: 'user#' },
        },
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

const projectParamsSchema = {
  type: 'object',
  properties: {
    additionalProperties: false,
    projectId: {
      type: 'string',
    },
  },
  required: ['projectId'],
} as const

const projectSearchQuerySchema = {
  type: 'object',
  properties: {
    additionalProperties: false,
    projectName: {
      type: 'string',
    },
    organizationName: {
      type: 'string',
    },
  },
  oneOf: [
    {
      required: ['projectName', 'organizationName'],
    },
    { required: [] },
  ],
}

export const getUserProjectsSchema = {
  description: 'Retrieve a user\'s projects',
  tags: ['project'],
  summary: 'Retrieve a user\'s projects with further informations',
  response: {
    200: {
      type: 'array',
      items: fullProjectInfosSchema,
    },
  },
} as const

export const getProjectByIdSchema = {
  description: 'Retrieve a project by its id',
  tags: ['project'],
  summary: 'Retrieve a project by its id, with further informations',
  params: projectParamsSchema,
  response: {
    200: fullProjectInfosSchema,
  },
} as const

export const getProjectSecretsSchema = {
  description: 'Retrieve a project secrets by its id',
  tags: ['project'],
  summary: 'Retrieve a project secrets by its id, owner only',
  params: projectParamsSchema,
  response: {
    200: {
      type: 'object',
      patternProperties: {
        '^.+$': {
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
  query: projectSearchQuerySchema,
  response: {
    200: {
      type: 'array',
      items: fullProjectInfosSchema,
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
  },
  response: {
    201: projectOpenApiSchema,
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
    200: projectOpenApiSchema,
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

export const patchProjectSchema = {
  description: 'Lock / Unlock a project',
  tags: ['project'],
  summary: 'Lock / Unlock a project',
  params: {
    type: 'object',
    properties: {
      additionalProperties: false,
      projectId: {
        type: 'string',
      },
    },
    required: ['projectId'],
  },
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      lock: { type: 'boolean' },
    },
  },
  response: {
    204: {},
  },
} as const
