import { type Hook, createHook } from './hook.js'
import type { Environment, ExternalRepoUrl, ExternalToken, ExternalUserName, InternalRepoName, InternalUrl, IsInfra, IsPrivate, Organization } from './index.js'
import type { Project } from './project.js'

export type Repository = {
  url: string
}
export type Repositories = Repository[]
export type RepositoryCreate = {
  internalUrl: string
  project: Project
  organization: Organization
  environments: Environment[]
  internalRepoName: InternalRepoName
  externalUserName: ExternalUserName
  externalToken?: ExternalToken
  externalRepoUrl: ExternalRepoUrl
  isPrivate: IsPrivate
  isInfra: IsInfra
}
export type RepositoryForEnv = {
  internalRepoName: InternalRepoName
} & Repository
export type RepositoryUpdate = Omit<RepositoryCreate, 'isInfra' | 'environments' | 'internalUrl' | 'isPrivate'>
export type RepositoryDelete = RepositoryCreate & { internalUrl: InternalUrl }

export type CreateRepositoryValidateArgs = void
export type CreateRepositoryExecArgs = RepositoryCreate
export type UpdateRepositoryValidateArgs = void
export type UpdateRepositoryExecArgs = RepositoryUpdate
export type DeleteRepositoryValidateArgs = void
export type DeleteRepositoryExecArgs = RepositoryDelete

export const createRepository: Hook<CreateRepositoryExecArgs, CreateRepositoryValidateArgs> = createHook()
export const updateRepository: Hook<UpdateRepositoryExecArgs, UpdateRepositoryValidateArgs> = createHook()
export const deleteRepository: Hook<DeleteRepositoryExecArgs, DeleteRepositoryValidateArgs> = createHook()
