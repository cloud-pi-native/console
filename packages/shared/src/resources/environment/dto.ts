import { ClusterModel } from '../cluster/model.js'
import { ProjectModel } from '../project/index.js'
import { EnvironmentModel } from './model.js'

export type InitializeEnvironmentDto = {
  body: {
    name: EnvironmentModel['name'],
    projectId: ProjectModel['id'],
    quotaId?: EnvironmentModel['quotaId'],
    clustersId: ClusterModel['id'][],
  }
  params: { projectId: ProjectModel['id'] }
}

export type UpdateEnvironmentDto = InitializeEnvironmentDto & { params: { environmentId: EnvironmentModel['id'] } }

export type DeleteEnvironmentDto = {
  params: {
    projectId: ProjectModel['id'],
    environmentId: string
  }
}
