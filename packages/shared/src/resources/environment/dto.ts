import { ClusterModel } from '../cluster/model.js'
import { ProjectModel } from '../project/index.js'
import { EnvironmentModel } from './model.js'

export type InitializeEnvironmentDto = {
  body: {
    name: EnvironmentModel['name'];
    projectId: ProjectModel['id'];
    clusterId: ClusterModel['id'];
    quotaStageId: EnvironmentModel['quotaStageId'];
    quotaStage?: any;
  }
  params: { projectId: ProjectModel['id'] }
}

export type UpdateEnvironmentDto = Partial<InitializeEnvironmentDto> & { params: { environmentId: EnvironmentModel['id'] } }

export type DeleteEnvironmentDto = {
  params: {
    projectId: ProjectModel['id'],
    environmentId: EnvironmentModel['id'],
  }
}
