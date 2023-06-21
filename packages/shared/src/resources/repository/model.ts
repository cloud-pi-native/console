import { projectStatus } from '../../utils/index.js'
import { ProjectModel } from '../project/index.js'

export type RepositoryModel = {
  id: string
  projectId: ProjectModel['id']
  internalRepoName: string
  externalRepoUrl: string
  externalUserName?: string
  externalToken?: string
  isInfra: boolean
  isPrivate: boolean
  status: typeof projectStatus[number]
}
