import { json2csv } from 'json-2-csv'
import { getAllProjects as getAllProjectsQuery, lockProject, getAllProjectsDataForExport } from '@/resources/queries-index.js'
import { unlockProjectIfNotFailed } from '@/utils/business.js'
import { BadRequestError } from '@/utils/errors.js'
import type { Project } from '@prisma/client'

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

export const generateProjectsData = async () => {
  try {
    const projects = await getAllProjectsDataForExport()

    return json2csv(projects, {
      emptyFieldValue: '',
    })
  } catch (error) {
    throw new BadRequestError(error.message)
  }
}
