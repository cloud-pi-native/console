export const repositoryOpenApiSchema = {
  $id: 'repository',
  type: 'object',
  additionalProperties: false,
  properties: {
    id: {
      type: 'string',
    },
    internalRepoName: {
      type: 'string',
    },
    externalRepoUrl: {
      type: 'string',
    },
    externalUserName: {
      type: 'string',
    },
    externalToken: {
      type: 'string',
    },
    isInfra: {
      type: 'boolean',
    },
    isPrivate: {
      type: 'boolean',
    },
    projectId: {
      type: 'string',
    },
    status: {
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
