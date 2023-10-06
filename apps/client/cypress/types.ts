import { ProjectInfos, RepositoryModel } from '@dso-console/shared'

export type Project = Partial<Pick<ProjectInfos, 'name' | 'id' | 'description' | 'locked' | 'organization'>>

export type Repository = Partial<RepositoryModel>

export type CiForm = {
  language: string,
  version: string,
  install?: string,
  build?: string,
  artefactDir?: string,
  workingDir: string,
}
