import type { Project as ProjectType, Repo } from '@cpn-console/shared'

export type Project = Partial<Pick<ProjectType, 'name' | 'id' | 'description' | 'locked'>>

export type Repository = Partial<Repo>

export interface CiForm {
  language: string
  version: string
  install?: string
  build?: string
  artefactDir?: string
  workingDir: string
}
