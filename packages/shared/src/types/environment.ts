import { projectStatus } from '../utils/const'
import { Cluster } from './cluster'

export type EnvironmentStatus = typeof projectStatus[number]

export type Environment = {
  id: string
  name: string
  projectId: string
  status: EnvironmentStatus
}

export type EnvironmentClusters = Environment & { clusters: Cluster[] }
