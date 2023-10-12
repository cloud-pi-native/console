import {
  getEnvironmentsByProjectId,
  getProjectRepositories,
  getProjectById,
  lockProject,
  unlockProject,
} from '@/resources/queries-index.js'
import { Project } from '@prisma/client'

export const unlockProjectIfNotFailed = async (projectId: Project['id']) => {
  const environmentStatuses = (await getEnvironmentsByProjectId(projectId))?.map(environment => environment?.status)
  const repositoryStatuses = (await getProjectRepositories(projectId))?.map(repository => repository?.status)
  const projectStatus = (await getProjectById(projectId))?.status
  const ressources = [
    ...environmentStatuses,
    ...repositoryStatuses,
    projectStatus,
  ]
  if (ressources.includes('failed')) {
    return lockProject(projectId)
  } else {
    return unlockProject(projectId)
  }
}
