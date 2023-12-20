import { nonSensitiveClusterOpenApiSchema, sensitiveClusterOpenApiSchema } from '../../openApiSchemas/cluster.js'

export const createClusterDto = {
  properties: sensitiveClusterOpenApiSchema.properties,
  required: [
    'label',
    'privacy',
    'clusterResources',
    'cluster',
    'user',
  ],
} as const

const clusterParamsSchema = {
  type: 'object',
  properties: {
    clusterId: {
      type: 'string',
    },
  },
  required: ['clusterId'],
} as const

export const getClustersSchema = {
  description: 'Retrieve public clusters',
  tags: ['cluster'],
  summary: 'Retrieve public clusters with filtered informations',
  response: {
    200: {
      type: 'array',
      items: nonSensitiveClusterOpenApiSchema,
    },
  },
} as const

export const getAdminClustersSchema = {
  description: 'Retrieve clusters as admin',
  tags: ['cluster'],
  summary: 'Retrieve all clusters with all informations',
  response: {
    200: {
      type: 'array',
      items: {
        ...sensitiveClusterOpenApiSchema,
        properties: {
          ...sensitiveClusterOpenApiSchema.properties,
          projectIds: {
            type: 'array',
            items: { type: 'string' },
          },
          stageIds: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
  },
} as const

export const getClusterAssociatedEnvironmentsSchema = {
  description: 'Retrieve environments associated to a cluster',
  tags: ['cluster', 'environment'],
  summary: 'Retrieve environments associated to a cluster, for admins only',
  params: clusterParamsSchema,
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          organization: {
            type: 'string',
          },
          project: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          owner: {
            type: 'string',
          },
        },
      },
    },
  },
} as const

// TODO : typage perdu dans DTO avec required dynamique, IIFE pas appliquable
export const createClusterSchema = {
  description: 'Create a cluster',
  tags: ['cluster'],
  summary: 'Create a cluster, for admins only',
  body: {
    type: 'object',
    properties: createClusterDto.properties,
    required: ['label', 'privacy', 'clusterResources', 'infos', 'cluster', 'user'],
    // required: Object.keys(createClusterDto).filter(key => key !== 'projectIds' && key !== 'stageIds'),
  },
  response: {
    201: sensitiveClusterOpenApiSchema,
  },
} as const

export const updateClusterSchema = {
  description: 'Update a cluster',
  tags: ['cluster'],
  summary: 'Update a cluster, for admins only',
  params: clusterParamsSchema,
  body: {
    type: 'object',
    properties: createClusterDto.properties,
    required: [], // Yes, nothing is required
  },
  response: {
    200: sensitiveClusterOpenApiSchema,
  },
} as const

export const deleteClusterSchema = {
  description: 'Delete a cluster',
  tags: ['cluster'],
  summary: 'Delete a cluster, for admins only',
  params: clusterParamsSchema,
  response: {
    204: {},
  },
} as const
