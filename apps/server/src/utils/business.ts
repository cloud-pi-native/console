import type { Log, Project, User } from '@prisma/client'
import { type PluginResult, hooks } from '@dso-console/hooks'
import { type SharedSafeParseReturnType, parseZodError } from '@dso-console/shared'
import {
  getEnvironmentsByProjectId,
  getProjectRepositories,
  getProjectById,
  lockProject,
  unlockProject,
  addLogs,
} from '@/resources/queries-index.js'
import { BadRequestError } from './errors.js'

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

export const checkCreateProject = async (owner: User, resource: 'Project' | 'Repository', requestId: Log['requestId']) => {
  const pluginsResults = await hooks.createProject.validate({ owner })
  if (pluginsResults?.failed) {
    const reasons = Object.values(pluginsResults)
      .filter((plugin: PluginResult) => plugin?.status?.result === 'KO')
      .map((plugin: PluginResult) => plugin.status.message)
      .join('; ')

    // @ts-ignore
    await addLogs(`Create ${resource} Validation`, pluginsResults, owner.id, requestId)

    const message = 'Echec de la validation des prérequis par les services externes'
    throw new BadRequestError(message, { description: reasons })
  }
}

export const validateSchema = (schemaValidation: SharedSafeParseReturnType) => {
  if (!schemaValidation.success) throw new BadRequestError(parseZodError(schemaValidation.error))
}
