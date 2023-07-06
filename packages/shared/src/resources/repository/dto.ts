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
