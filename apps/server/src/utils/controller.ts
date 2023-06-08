import { adminGroupPath } from 'shared'
import { sendForbidden } from './response.js'
import { getEnvironmentsByProjectId } from '../models/queries/environment-queries.js'
import { getProjectRepositories } from '../models/queries/repository-queries.js'
import { getProjectById, lockProject, unlockProject } from '../models/queries/project-queries.js'

export const checkAdminGroup = (req, res, done) => {
  if (!req.session.user.groups?.includes(adminGroupPath)) {
    sendForbidden(res, 'Vous n\'avez pas les droits administrateur')
  }
  done()
}

export const unlockProjectIfNotFailed = async (projectId) => {
  const ressources = [
    ...(await getEnvironmentsByProjectId(projectId))?.map(environment => environment.status),
    ...(await getProjectRepositories(projectId))?.map(repository => repository.status),
    (await getProjectById(projectId))?.status,
  ]
  if (ressources.includes('failed')) {
    await lockProject(projectId)
  } else {
    await unlockProject(projectId)
  }
}
