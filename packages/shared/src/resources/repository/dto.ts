import { ProjectModel } from '../project'

export type CreateRepositoryDto = {
  body: {
  projectId: string
  internalRepoName: string
  externalRepoUrl: string
  externalUserName?: string
  externalToken?: string
  isInfra: boolean
  isPrivate: boolean
  },
  params: {
    projectId: string
  }
}

export type UpdateRepositoryDto = {
  body: Partial<CreateRepositoryDto['body']> & {
    id: string
  },
  params: {
    projectId: string
    repositoryId: string
  }
}

export type DeleteRepositoryDto = {
  params: {
    projectId: string
    repositoryId: string
  }
}

export type GenerateCIFilesDto = {
  body: {
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
  },
}
