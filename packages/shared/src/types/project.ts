import { projectStatus } from '../utils/const'

export type ProjectStatus = typeof projectStatus[number]

export type Project = {
  id: string
  name: string
  organization: string
  description: string
  status: ProjectStatus
  locked: boolean
  services: Record<string, unknown>
}
