import { json2csv } from 'json-2-csv'
import type { Project } from '@prisma/client'
import { getAllProjects as getAllProjectsQuery, lockProject, getAllProjectsDataForExport, unlockProject } from '@/resources/queries-index.js'
import { BadRequestError } from '@/utils/errors.js'
import { projectAdminContract } from '@cpn-console/shared'

export const getAllProjects = async (query: typeof projectAdminContract.getAllProjects.query._type) => {
  return getAllProjectsQuery(query)
}
export const handleProjectLocking = async (projectId: Project['id'], lock: Project['locked']) => {
  try {
    if (lock) {
      await lockProject(projectId)
    } else {
      await unlockProject(projectId)
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
