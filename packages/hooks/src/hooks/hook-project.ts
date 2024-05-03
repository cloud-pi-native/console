import type { Role as RoleFromSchema } from '@cpn-console/shared'
import { ClusterObject, ExternalRepoUrl, InternalRepoName, IsInfra, IsPrivate, UserObject } from './index.js'
import { Hook, createHook } from './hook.js'

export type ResourceQuotaType = {
  memory: string
  cpu: number
}

export type RepoCreds = {
  username: string
  token: string
}

export type Role = {
  userId: UserObject['id']
  role: RoleFromSchema['role']
}

export type Environment = {
  id: string
  name: string
  clusterId: ClusterObject['id']
  quota: ResourceQuotaType
  stage: string
  permissions: {
    userId: UserObject['id']
    permissions: {
      ro: boolean
      rw: boolean
    }
  }[]
}

export type Repository = {
  id: string;
  internalRepoName: InternalRepoName;
  newCreds?: RepoCreds
  externalRepoUrl: ExternalRepoUrl;
  isPrivate: IsPrivate;
  isInfra: IsInfra;
}

export interface ProjectStore {
  [x: string]: { [x: string]: string }
}

export type Project = {
  id: string
  description: string | null
  name: string
  status: string
  clusters: ClusterObject[]
  organization: {
    id: string
    name: string
    label: string
  }
  environments: Environment[]
  repositories: Repository[]
  users: UserObject[]
  roles: Role[]
  store: ProjectStore
}

export const upsertProject: Hook<Project, Project> = createHook()
export const deleteProject: Hook<Project, Project> = createHook()
