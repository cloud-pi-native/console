import { ClusterPrivacy, Cluster, User } from './misc.js'

export type ClusterModel = {
  id: string
  label: string
  user: Pick<User, 'username' | 'password' | 'token' | 'certData' | 'keyData'>
  cluster: Pick<Cluster, 'name' | 'caData' | 'server' | 'tlsServerName'>
  secretName: string
  clusterResources: boolean
  privacy: ClusterPrivacy
}
