import { PluginResult } from '@/plugins/hooks/hook.js'
import { hooks } from '@/plugins/index.js'
import {
  getEnvironmentsByProjectId,
  getProjectRepositories,
  getProjectById,
  lockProject,
  unlockProject,
  addLogs,
} from '@/resources/queries-index.js'
import type { Log, Project, User } from '@prisma/client'
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
