import {
  getEnvironmentsByProjectId,
  getProjectRepositories,
  getProjectById,
  lockProject,
  unlockProject,
} from '@/resources/queries-index.js'
import { Project } from '@prisma/client'

export const unlockProjectIfNotFailed = async (projectId: Project['id']) => {
  const ressources = [
    ...(await getEnvironmentsByProjectId(projectId))?.map(environment => environment?.status),
    ...(await getProjectRepositories(projectId))?.map(repository => repository?.status),
    (await getProjectById(projectId))?.status,
  ]
  if (ressources.includes('failed')) {
    return lockProject(projectId)
  } else {
    return unlockProject(projectId)
  }
}
