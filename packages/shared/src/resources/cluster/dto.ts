import { ProjectModel } from '../project/index.js'
import { ClusterModel } from './model.js'

type ClusterBodyDto = Omit<ClusterModel, 'secretName'> & {
  projectIds?: ProjectModel['id'][]
  stageIds?: string[]
  infos: string
}
export type UpdateClusterDto = {
  body: Partial<ClusterBodyDto> & { id: ClusterModel['id'], infos: string }
  params: { clusterId: ClusterModel['id'] }
}
export type CreateClusterDto = { body: Omit<ClusterBodyDto, 'id'> }
