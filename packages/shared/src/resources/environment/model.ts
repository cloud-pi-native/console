import { projectStatus } from '../../utils/index.js'
import { ProjectModel } from '../project/index.js'

export type EnvironmentModel = {
  id: string
  projectId: ProjectModel['id']
  quotaId: string,
  dsoEnvironmentId: string,
  status: typeof projectStatus[number]
}
