import { UserModel } from 'shared'
import { type Hook, createHook } from './hook.js'
import type { Environment, Organization } from './index.js'
import type { RepositoryForEnv } from './repository.js'
import type { Project } from './project.js'
import { User } from '@prisma/client'
import { ClusterMix } from '@/types/index.js'

type EnvironmentInit = {
  organization: Organization,
  project: Project
  environment: Environment
  repositories: RepositoryForEnv[]
  owner: User
}

type EnvironmentDelete = {
  project: Project
  organization: Organization
  environment: Environment
  repositories: RepositoryForEnv[]
}

export type RemoveEnvironmentClusterExecArgs = {
  project: Project
  organization: Organization
  environment: Environment
  cluster: ClusterMix
}

export type AddEnvironmentClusterExecArgs = RemoveEnvironmentClusterExecArgs & { owner: UserModel }

export type InitializeEnvironmentValidateArgs = EnvironmentInit
export type InitializeEnvironmentExecArgs = EnvironmentInit

export type DeleteEnvironmentValidateArgs = EnvironmentDelete
export type DeleteEnvironmentExecArgs = EnvironmentDelete

export const initializeEnvironment: Hook<InitializeEnvironmentExecArgs, InitializeEnvironmentValidateArgs> = createHook()
export const deleteEnvironment: Hook<DeleteEnvironmentExecArgs, DeleteEnvironmentValidateArgs> = createHook()

export const addEnvironmentCluster: Hook<AddEnvironmentClusterExecArgs, void> = createHook()
export const removeEnvironmentCluster: Hook<RemoveEnvironmentClusterExecArgs, void> = createHook()
