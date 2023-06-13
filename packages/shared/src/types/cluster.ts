export type ClusterPrivacy = 'public' | 'dedicated'

export type Cluster = {
  id: string
  name: string
  server: string
  config: string
  secretName: string
  clusterResources: boolean
  privacy: ClusterPrivacy
}

export type ClusterCreate = Omit<Cluster, 'id'>

export type ClusterUpdate = Partial<Cluster> & Required<Pick<Cluster, 'id'>>

const a: ClusterUpdate = {
  id: 'khsbck',
}
