import { ClusterPrivacy } from '@cpn-console/shared'

export * from './cluster.js'
export * from './environment.js'
export * from './project.js'
export * from './team.js'
export * from './misc.js'
export * from './repository.js'
export * from './permission.js'

export type Organization = string
export type Environment = string
export type Environments = Environment[]
export type PartialEnvironment = { environment: string, stage: string, clusterLabel: string }
export type InternalRepoName = string
export type ExternalRepoUrl = string
export type ExternalUserName = string
export type ExternalToken = string
export type IsPrivate = boolean
export type IsInfra = boolean
export type InternalUrl = string
export type UserObject = {
  firstName: string,
  lastName: string,
  id: string,
  email: string
}
export type EnvironmentObject = {
  id: string;
  name: string;
  projectId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  clusterId: string;
  quotaStageId: string;
}

export interface KubeUser {
  readonly certData?: string;
  readonly keyData?: string;
  readonly token?: string;
  readonly username?: string;
  readonly password?: string;
}

export interface KubeCluster {
  readonly caData?: string;
  readonly server: string;
  readonly skipTLSVerify?: boolean;
  readonly tlsServerName?: string;
}

export type ClusterObject = {
  id: string;
  label: string;
  privacy: ClusterPrivacy;
  secretName: string;
  clusterResources: boolean;
  infos: string;
  cluster: KubeCluster;
  user: KubeUser
}
