import { FromSchema } from 'json-schema-to-ts'
import { ProjectModel } from '../project'
import { createRepositorySchema, updateRepositorySchema } from './openApiSchema.js'

export type CreateRepositoryDto = FromSchema<typeof createRepositorySchema['body']>

export type UpdateRepositoryDto = FromSchema<typeof updateRepositorySchema['body']>

export type RepositoryParams = FromSchema<typeof updateRepositorySchema['params']>

export type ProjectRepositoriesParams = FromSchema<typeof createRepositorySchema['params']>

export type GenerateCIFilesDto = {
  typeLanguage?: string,
  isJava?: boolean,
  isNode?: boolean,
  isPython?: boolean,
  projectName?: ProjectModel['name'],
  internalRepoName?: string,
  nodeVersion?: string,
  nodeInstallCommand?: string,
  nodeBuildCommand?: string,
  workingDir?: string,
  javaVersion?: string,
  artefactDir?: string,
}
