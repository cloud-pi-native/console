import { type Hook, createHook } from './hook.js'
import type { Environment, InternalRepoName, Organization, User } from './index.js'
import type { RepositoryForEnv } from './repository.js'
import type { Project } from './project.js'
import { ClusterModel } from 'shared/types/index.js'

type EnvironmentInit = {
  internalRepoName: InternalRepoName,
  organization: Organization,
  project: Project,
  environment: Environment,
  repositories: RepositoryForEnv[],
  owner: User,
  clusters: ClusterModel[]
}

type EnvironmentDelete = {
  project: Project,
  organization: Organization,
  environment: Environment,
  repositories: RepositoryForEnv[]
  clusters: ClusterModel[]
}

type EnvironmentClustersUpdate = {
  project: Project,
  organization: Organization,
  environment: Environment,
  repositories: RepositoryForEnv[]
  currentClusters: ClusterModel[]
  removedClusters: ClusterModel[]
}

export type InitializeEnvironmentValidateArgs = EnvironmentInit
export type InitializeEnvironmentExecArgs = EnvironmentInit

export type DeleteEnvironmentValidateArgs = EnvironmentDelete
export type DeleteEnvironmentExecArgs = EnvironmentDelete

export type UpdateEnvironmentClustersExecArgs = EnvironmentClustersUpdate
export type UpdateEnvironmentClustersValidateArgs = EnvironmentClustersUpdate

export const initializeEnvironment: Hook<InitializeEnvironmentExecArgs, InitializeEnvironmentValidateArgs> = createHook()
export const deleteEnvironment: Hook<DeleteEnvironmentExecArgs, DeleteEnvironmentValidateArgs> = createHook()
export const updateEnvironmentClusters: Hook<UpdateEnvironmentClustersExecArgs, UpdateEnvironmentClustersValidateArgs> = createHook()
