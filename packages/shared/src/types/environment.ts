import { projectStatus } from '../utils/const'

export type EnvironmentStatus = typeof projectStatus[number]

export type Environment = {
  id: string
  name: string
  projectId: string
  status: EnvironmentStatus
}
