export const createClusterDto = {
  label: {
    type: 'string',
  },
  privacy: {
    enum: ['public', 'dedicated'],
  },
  clusterResources: {
    type: 'boolean',
  },
  infos: {
    type: 'string',
  },
  cluster: {
    type: 'object',
    properties: {
      caData: {
        type: 'string',
      },
      server: {
        type: 'string',
      },
      tlsServerName: {
        type: 'string',
      },
    },
  },
  projectIds: {
    type: 'array',
    items: {
      type: 'string',
    },
  },
  stageIds: {
    type: 'array',
    items: {
      type: 'string',
    },
  },
  user: {
    type: 'object',
    properties: {
      certData: {
        type: 'string',
      },
      keyData: {
        type: 'string',
      },
    },
  },
} as const

export const clusterOpenApiSchema = {
  $id: 'cluster',
  type: 'object',
  properties: {
    id: {
      type: 'string',
    },
    ...createClusterDto,
    kubeConfigId: {
      type: 'string',
    },
    secretName: {
      type: 'string',
    },
    createdAt: {
      type: 'string',
    },
    updatedAt: {
      type: 'string',
    },
    kubeconfig: {
      type: 'object',
      // type: kubeconfigSchema,
    },
    projects: {
      type: 'array',
      items: { $ref: 'project#' },
    },
    environments: {
      type: 'array',
      items: { $ref: 'environment#' },
    },
    stages: {
      type: 'array',
      items: { $ref: 'stage#' },
    },
  },
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
  description: 'Retrieve clusters',
  tags: ['cluster'],
  summary: 'Retrieve clusters with filtered informations',
  response: {
    200: {
      type: 'array',
      items: { $ref: 'cluster#' },
    },
  },
} as const

export const getClusterAssociatedEnvironmentsSchema = {
  description: 'Retrieve environments associated to a cluster',
  params: clusterParamsSchema,
  tags: ['cluster', 'environment'],
  summary: 'Retrieve environments associated to a cluster, for admins only',
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
    properties: createClusterDto,
    required: ['label', 'privacy', 'clusterResources', 'infos', 'cluster', 'user'],
    // required: Object.keys(createClusterDto).filter(key => key !== 'projectIds' && key !== 'stageIds'),
  },
  response: {
    201: { $ref: 'cluster#' },
  },
} as const

export const updateClusterSchema = {
  description: 'Update a cluster',
  tags: ['cluster'],
  summary: 'Update a cluster, for admins only',
  params: clusterParamsSchema,
  body: {
    type: 'object',
    properties: createClusterDto,
  },
  response: {
    200: { $ref: 'cluster#' },
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
