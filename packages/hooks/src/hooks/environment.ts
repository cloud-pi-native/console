import { type Hook, createHook } from './hook.js'
import type { ClusterObject, Environment, Organization, PartialEnvironment, UserObject } from './index.js'
import type { RepositoryForEnv } from './repository.js'
import type { Project } from './project.js'

export type ResourceQuotaType = {
  memory: string
  cpu: number
}

export type EnvironmentBase = {
  organization: Organization
  project: Project
  environment: Environment
  environments?: PartialEnvironment[]
}

export type EnvironmentCreateArgs = {
  repositories: RepositoryForEnv[]
  quota: ResourceQuotaType
  owner: UserObject
  cluster: ClusterObject
} & EnvironmentBase

export type EnvironmentQuotaUpdateArgs = {
  repositories: RepositoryForEnv[]
  quota: ResourceQuotaType
  cluster: ClusterObject
} & EnvironmentBase

export type EnvironmentDeleteArgs = {
  repositories: RepositoryForEnv[]
  cluster: ClusterObject
  stage: string
} & EnvironmentBase

export const initializeEnvironment: Hook<EnvironmentCreateArgs, Record<string, never>> = createHook()
export const deleteEnvironment: Hook<EnvironmentDeleteArgs, Record<string, never>> = createHook()
export const updateEnvironmentQuota: Hook<EnvironmentQuotaUpdateArgs, Record<string, never>> = createHook()
