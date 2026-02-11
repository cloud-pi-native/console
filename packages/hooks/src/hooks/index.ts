export * from './hook-cluster.js'
export * from './hook-misc.js'
export * from './hook-project.js'
export * from './hook-project-role.js'
export * from './hook-project-member.js'
export * from './hook-user.js'
export * from './hook-zone.js'
export * from './hook-admin-role.js'

export interface PartialEnvironment { environment: string, stage: string, clusterLabel: string }
export type InternalRepoName = string
export type ExternalRepoUrl = string
export type ExternalUserName = string
export type ExternalToken = string
export type IsPrivate = boolean
export type IsInfra = boolean
export type InternalUrl = string
export interface UserObject {
  firstName: string
  lastName: string
  id: string
  email: string
}
export interface EnvironmentObject {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  clusterId: string
}

export interface KubeUser {
  readonly certData?: string
  readonly keyData?: string
  readonly token?: string
  readonly username?: string
  readonly password?: string
}

export interface KubeCluster {
  readonly caData?: string
  readonly server: string
  readonly skipTLSVerify?: boolean
  readonly tlsServerName?: string
}

export interface ZoneObject {
  id: string
  slug: string
  label: string
  argocdUrl: string
  clusterNames?: string[]
}

export interface ClusterObject {
  id: string
  label: string
  privacy: 'public' | 'dedicated'
  /**
   * @deprecated Le nom aléatoire stocké ici n'est plus utilisé, au profit d'un nom caculé et déterministe.
   */
  secretName: string
  clusterResources: boolean
  infos: string | null
  cluster: KubeCluster
  user: KubeUser
  zone: ZoneObject
}
