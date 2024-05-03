export * from './hook-cluster.js'
export * from './hook-misc.js'
export * from './hook-project.js'

export type Organization = string
export type PartialEnvironment = { environment: string, stage: string, clusterLabel: string }
export type InternalRepoName = string
export type ExternalRepoUrl = string
export type ExternalUserName = string
export type ExternalToken = string
export type IsPrivate = boolean
export type IsInfra = boolean
export type InternalUrl = string
export type UserObject = {
  firstName: string
  lastName: string
  id: string
  email: string
}
export type EnvironmentObject = {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  clusterId: string
  quotaStageId: string
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

export type ZoneObject = {
  id: string
  slug: string
}

export type ClusterObject = {
  id: string
  label: string
  privacy: 'public' | 'dedicated'
  secretName: string
  clusterResources: boolean
  infos: string | null
  cluster: KubeCluster
  user: KubeUser
  zone: ZoneObject
}
