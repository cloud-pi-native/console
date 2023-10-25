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

// Examples
// const create: CreateClusterDto = {
//   clusterResources: false,
//   label: 'Tartempion',
//   privacy: 'dedicated',
//   projectIds: ['projectId1'],
//   cluster: {
//     name: 'my-cluster',
//     server: 'https://mycluster.com',
//     caData: 'b64encoded certificate==',
//   },
//   user: {
//     token: 'My Access Token',
//   },
// }

// const update: UpdateClusterDto = {
//   id: 'clusterId A',
//   ...create,
//   projectIds: ['projectId1', 'projectId2'],
// }
