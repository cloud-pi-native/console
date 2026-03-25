import type { PluginApi } from '../utils/utils.ts'
import type { Hook } from './hook.ts'
import type { ClusterObject, ExternalRepoUrl, InternalRepoName, IsInfra, IsPrivate, UserObject } from './index.ts'
import { createHook } from './hook.ts'

export interface RepoCreds {
  username: string
  token: string
}

export interface Role {
  name: string
  permissions?: string
  position: number
  type?: string
  oidcGroup?: string
  users: UserObject[]
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
  autosync: boolean
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
  deployRevision: string | null
  deployPath: string | null
  helmValuesFiles: string | null
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
