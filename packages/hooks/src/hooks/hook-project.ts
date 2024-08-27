import type { Hook } from './hook.js'
import { createHook } from './hook.js'
import type { ClusterObject, ExternalRepoUrl, InternalRepoName, IsInfra, IsPrivate, UserObject } from './index.js'

export interface ResourceQuotaType {
  memory: string
  cpu: number
}

export interface RepoCreds {
  username: string
  token: string
}

export interface Role {
  userId: string
  role: 'owner' | 'user'
}

export interface Environment {
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

export interface Repository {
  id: string
  internalRepoName: InternalRepoName
  newCreds?: RepoCreds
  externalRepoUrl: ExternalRepoUrl
  isPrivate: IsPrivate
  isInfra: IsInfra
}

export interface ProjectStore {
  [x: string]: { [x: string]: string }
}

export interface Project {
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
  owner: UserObject
}

export const upsertProject: Hook<Project, Project> = createHook()
export const deleteProject: Hook<Project, Project> = createHook()
