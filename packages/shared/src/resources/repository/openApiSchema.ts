export const createRepositoryDto = {
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
} as const

const projectRepositoriesParams = {
  type: 'object',
  properties: {
    projectId: {
      type: 'string',
    },
  },
  required: ['projectId'],
} as const

const repositoryParams = {
  type: 'object',
  properties: {
    projectId: {
      type: 'string',
    },
    repositoryId: {
      type: 'string',
    },
  },
  required: ['projectId', 'repositoryId'],
} as const

export const getRepositoryByIdSchema = {
  description: 'Retrieve a repository by its id',
  tags: ['repository'],
  summary: 'Retrieve a repository by its id',
  params: repositoryParams,
  response: {
    200: { $ref: 'repository#' },
  },
} as const

export const getProjectRepositoriesSchema = {
  description: 'Retrieve a project\'s repositories',
  tags: ['repository'],
  summary: 'Retrieve a project\'s repositories',
  params: projectRepositoriesParams,
  response: {
    200: {
      type: 'array',
      items: { $ref: 'repository#' },
    },
  },
} as const

export const createRepositorySchema = {
  description: 'Create a repository',
  tags: ['repository'],
  summary: 'Create a repository',
  params: projectRepositoriesParams,
  body: {
    type: 'object',
    properties: createRepositoryDto,
    required: ['internalRepoName', 'externalRepoUrl'],
  },
  response: {
    200: {
      type: 'array',
      items: { $ref: 'repository#' },
    },
  },
} as const

export const updateRepositorySchema = {
  description: 'Update a repository',
  tags: ['repository'],
  summary: 'Update a repository',
  params: repositoryParams,
  body: {
    type: 'object',
    properties: {
      externalRepoUrl: createRepositoryDto.externalRepoUrl,
      isPrivate: createRepositoryDto.isPrivate,
      externalToken: createRepositoryDto.externalToken,
      externalUserName: createRepositoryDto.externalUserName,
    },
  },
  response: {
    200: {
      type: 'array',
      items: { $ref: 'repository#' },
    },
  },
} as const

export const deleteRepositorySchema = {
  description: 'Delete a repository',
  tags: ['repository'],
  summary: 'Delete a repository',
  params: repositoryParams,
  response: {
    200: {
      type: 'string',
    },
  },
} as const
