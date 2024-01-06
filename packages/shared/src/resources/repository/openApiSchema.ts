const generateCIFilesDto = {
  typeLanguage: { type: 'string' },
  isJava: { type: 'boolean' },
  isNode: { type: 'boolean' },
  isPython: { type: 'boolean' },
  projectName: { type: 'string' },
  internalRepoName: { type: 'string' },
  nodeVersion: { type: 'string' },
  nodeInstallCommand: { type: 'string' },
  nodeBuildCommand: { type: 'string' },
  workingDir: { type: 'string' },
  javaVersion: { type: 'string' },
  artefactDir: { type: 'string' },
} as const

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

export const repositoryOpenApiSchema = {
  $id: 'repository',
  type: 'object',
  title: 'repository',
  properties: {
    id: {
      type: 'string',
    },
    ...createRepositoryDto,
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
    project: { $ref: 'project#' },
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

export const generateCIFilesSchema = {
  description: 'Generate CI Files for a given technology',
  tags: ['repository'],
  summary: 'Generate CI Files for a given technology',
  body: {
    type: 'object',
    properties: generateCIFilesDto,
  },
  response: {
    200: {
      type: 'array',
      items: repositoryOpenApiSchema,
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
