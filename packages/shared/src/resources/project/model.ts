import { projectStatus } from '../../utils/index.js'
import type { OrganizationModel } from '../organization/index.js'

export type ProjectModel = {
  id: string
  name: string
  status: typeof projectStatus[number]
  organizationId: OrganizationModel['id']
  description: string
  locked: boolean
  services: object
}
