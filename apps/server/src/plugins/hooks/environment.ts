import { type Hook, createHook } from './hook.js'
import type { Environment, InternalRepoName, Organization, User } from './index.js'
import type { Repository } from './repository.js'
import type { Project } from './project.js'

type EnvironmentInit = {
  internalRepoName: InternalRepoName,
  organization: Organization,
  project: Project,
  environment: Environment,
  repositories: Repository[],
  owner: User,
}

type EnvironmentDelete = {
  project: Project,
  organization: Organization,
  environment: Environment,
  repositories: Repository[]
}

export type InitializeEnvironmentValidateArgs = EnvironmentInit
export type InitializeEnvironmentExecArgs = EnvironmentInit
export type DeleteEnvironmentValidateArgs = void
export type DeleteEnvironmentExecArgs = EnvironmentDelete

export const initializeEnvironment: Hook<InitializeEnvironmentExecArgs, InitializeEnvironmentValidateArgs> = createHook()
export const deleteEnvironment: Hook<DeleteEnvironmentExecArgs, DeleteEnvironmentValidateArgs> = createHook()
