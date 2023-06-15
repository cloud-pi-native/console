import { ClusterModel } from './cluster'

export type createClusterReqBody = Omit<ClusterModel, 'id' | 'secretName'>
