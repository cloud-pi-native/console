import { getAllProjects as getAllProjectsQuery, lockProject } from '@/resources/queries-index.js'
import { unlockProjectIfNotFailed } from '@/utils/business.js'
import { BadRequestError } from '@/utils/errors.js'
import { Project } from '@prisma/client'

export const getAllProjects = async () => {
  return getAllProjectsQuery()
}

export const handleProjectLocking = async (projectId: Project['id'], lock: Project['locked']) => {
  try {
    if (lock) {
      await lockProject(projectId)
    } else {
      await unlockProjectIfNotFailed(projectId)
    }
  } catch (error) {
    throw new BadRequestError(error.message)
  }
}
