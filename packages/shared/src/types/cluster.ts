import { User, Cluster } from '@kubernetes/client-node'

export type ClusterPrivacy = 'public' | 'dedicated'

export type ClusterModel = {
  id: string
  label: string
  user: Pick<User, 'name' | 'certData' | 'keyData' | 'token' | 'username' | 'password'>
  cluster: Pick<Cluster, 'name' | 'caData' | 'server' | 'tlsServerName'>
  secretName: string
  clusterResources: boolean
  privacy: ClusterPrivacy
}

export type ClusterCreate = Omit<ClusterModel, 'id' | 'secretName'>

export type ClusterUpdate = Partial<ClusterModel> & Required<Pick<ClusterModel, 'id'>>
