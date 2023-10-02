import { projectStatus } from '../../utils/index.js'
import type { OrganizationModel } from '../organization/index.js'
import { UserModel } from '../user/model.js'

export type ProjectModel = {
  id: string
  name: string
  status: typeof projectStatus[number]
  organizationId: OrganizationModel['id']
  description: string
  locked: boolean
  services: object
}

export type RoleModel = {
  userId: string
  projectId: ProjectModel['id']
  role: string
  user: UserModel
  project: ProjectModel
}
