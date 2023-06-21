import { ClusterPrivacy, UserAuthBasic, UserAuthCerts, UserAuthToken, Cluster } from './misc.js'

export type ClusterModel = {
  id: string
  label: string
  user: UserAuthBasic | UserAuthCerts | UserAuthToken
  cluster: Pick<Cluster, 'name' | 'caData' | 'server' | 'tlsServerName'>
  secretName: string
  clusterResources: boolean
  privacy: ClusterPrivacy
}
