import { type Hook, createHook } from './hook.js'
import type { Environment, Organization, PartialEnvironment } from './index.js'
import type { RepositoryForEnv } from './repository.js'
import type { Project } from './project.js'
import type { ClusterMix } from '@/types/index.js'
import type { Role, User } from '@prisma/client'

export type ResourceQuota = {
  memory: string
  cpu: number
}

export type EnvironmentBase = {
  organization: Organization
  project: Project
  environment: Environment
  environments: PartialEnvironment[]
  roles: Array<Role & { user: User }>
}

export type EnvironmentCreateArgs = {
  repositories: RepositoryForEnv[]
  quota: ResourceQuota
  owner: User
  cluster: ClusterMix
} & EnvironmentBase

export type EnvironmentQuotaUpdateArgs = {
  repositories: RepositoryForEnv[]
  quota: ResourceQuota
  cluster: ClusterMix
} & EnvironmentBase

export type EnvironmentDeleteArgs = {
  repositories: RepositoryForEnv[]
  cluster: ClusterMix
} & EnvironmentBase

export const initializeEnvironment: Hook<EnvironmentCreateArgs, void> = createHook()
export const deleteEnvironment: Hook<EnvironmentDeleteArgs, void> = createHook()
export const updateEnvironmentQuota: Hook<EnvironmentQuotaUpdateArgs, void> = createHook()
