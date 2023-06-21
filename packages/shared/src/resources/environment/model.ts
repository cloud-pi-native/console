import { allEnv, projectStatus } from '../../utils/index.js'
import { ProjectModel } from '../project/index.js'

export type EnvironmentModel = {
  id: string
  name: typeof allEnv[number]
  projectId: ProjectModel['id']
  status: typeof projectStatus[number]
}
