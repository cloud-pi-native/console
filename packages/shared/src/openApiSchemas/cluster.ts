export const nonSensitiveClusterOpenApiSchema = {
  $id: 'nonSensitiveCluster',
  type: 'object',
  properties: {
    id: {
      type: 'string',
    },
    infos: {
      type: 'string',
    },
    label: {
      type: 'string',
    },
    privacy: {
      enum: ['public', 'dedicated'],
    },
  },
  required: [
    'id',
    'infos',
    'label',
    'privacy',
  ],
  additionalProperties: false,
} as const

export const sensitiveClusterOpenApiSchema = {
  $id: 'sensitiveCluster',
  type: 'object',
  properties: {
    ...nonSensitiveClusterOpenApiSchema.properties,
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
    clusterResources: {
      type: 'boolean',
    },
    projectIds: {
      type: 'array',
      items: {
        type: 'string',
      },
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
        skipTLSVerify: {
          type: 'boolean',
        },
      },
      required: [
        'server',
      ],
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
  },
  additionalProperties: false,
} as const
