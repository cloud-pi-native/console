import type { PluginApi } from '@/utils/utils.js'
import type { Hook } from './hook.js'
import { createHook } from './hook.js'
import type { ClusterObject, ExternalRepoUrl, InternalRepoName, IsInfra, IsPrivate, UserObject } from './index.js'

export interface RepoCreds {
  username: string
  token: string
}

export interface Role {
  userId: string
  role: 'owner' | 'user'
}

export interface EnvironmentApis {
  [x: string]: PluginApi
}
export interface Environment {
  id: string
  name: string
  clusterId: ClusterObject['id']
  cpu: number
  gpu: number
  memory: number
  stage: string
  permissions: {
    userId: UserObject['id']
    permissions: {
      ro: boolean
      rw: boolean
    }
  }[]
  apis: EnvironmentApis
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
  slug: string
  environments: Environment[]
  repositories: Repository[]
  users: UserObject[]
  roles: Role[]
  store: ProjectStore
  owner: UserObject
}

export const upsertProject: Hook<Project> = createHook()
export const deleteProject: Hook<Project> = createHook()
