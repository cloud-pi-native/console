import type { Project as ProjectType, Repo } from '@cpn-console/shared'

export type Project = Partial<Pick<ProjectType, 'name' | 'id' | 'description' | 'locked' | 'organization'>>

export type Repository = Partial<Repo>

export type CiForm = {
  language: string,
  version: string,
  install?: string,
  build?: string,
  artefactDir?: string,
  workingDir: string,
}
