import { ProjectModel } from '../project/index.js'
import { EnvironmentModel } from './model.js'

export type InitializeEnvironmentDto = {
  body: {
    name: EnvironmentModel['name'],
    projectId: ProjectModel['id'],
  }
  params: { projectId: ProjectModel['id'] }
}

export type DeleteEnvironmentDto = {
  params: {
    projectId: ProjectModel['id'],
    environmentId: string
  }
}
