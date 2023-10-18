import { UserModel } from '@dso-console/shared'
import { type Hook, createHook } from './hook.js'
import type { Environment, Organization } from './index.js'
import type { RepositoryForEnv } from './repository.js'
import type { Project } from './project.js'
import { ClusterMix } from '@/types/index.js'

export type ResourceQuota = {
  memory: string
  cpu: number
}

type EnvironmentInit = {
  organization: Organization,
  project: Project
  environment: Environment
  repositories: RepositoryForEnv[]
  owner: UserModel
  quota: ResourceQuota
  cluster: ClusterMix
}

type EnvironmentQuotaUpdate = {
  organization: Organization,
  project: Project
  environment: Environment
  repositories: RepositoryForEnv[]
  quota: ResourceQuota
  cluster: ClusterMix
}

type EnvironmentDelete = {
  project: Project
  organization: Organization
  environment: Environment
  repositories: RepositoryForEnv[]
  cluster: ClusterMix
}

export type InitializeEnvironmentValidateArgs = EnvironmentInit
export type InitializeEnvironmentExecArgs = EnvironmentInit

export type UpdateEnvironmentQuotaValidateArgs = EnvironmentQuotaUpdate
export type UpdateEnvironmentQuotaExecArgs = EnvironmentQuotaUpdate

export type DeleteEnvironmentValidateArgs = EnvironmentDelete
export type DeleteEnvironmentExecArgs = EnvironmentDelete

export const initializeEnvironment: Hook<InitializeEnvironmentExecArgs, InitializeEnvironmentValidateArgs> = createHook()
export const deleteEnvironment: Hook<DeleteEnvironmentExecArgs, DeleteEnvironmentValidateArgs> = createHook()

export const updateEnvironmentQuota: Hook<UpdateEnvironmentQuotaExecArgs, void> = createHook()
