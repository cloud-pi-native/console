import { projectStatus } from '../../utils/index.js'
import { ClusterModel } from '../cluster/model.js'
import { PermissionModel } from '../permission/model.js'
import { ProjectModel } from '../project/index.js'

export type EnvironmentModel = {
  id: string
  name: string,
  projectId: ProjectModel['id']
  quotaStageId: string,
  clusterId: ClusterModel['id'],
  status: typeof projectStatus[number],
  permissions?: PermissionModel[],
}
