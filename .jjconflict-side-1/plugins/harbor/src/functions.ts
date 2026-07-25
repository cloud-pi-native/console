import type { PluginResult, Project, ProjectLite, StepCall } from '@cpn-console/hooks'
import type { VaultRobotSecret } from './robot.js'
import {

  specificallyDisabled,
  specificallyEnabled,
} from '@cpn-console/hooks'
import { DEFAULT, ENABLED } from '@cpn-console/shared'
// @ts-ignore pas de typage disponible pour le paquet bytes
import bytes from 'bytes'
import { logger } from './logger.js'
import { addProjectGroupMember } from './permission.js'
import { addRetentionPolicy } from './policy.js'
import { createProject, deleteProject } from './project.js'
import { deleteRobot, ensureRobot, roAccess, rwAccess } from './robot.js'
import {
  getApi,
  getConfig,
  projectRobotName,
  roRobotName,
  rwRobotName,
} from './utils.js'

export const createDsoProject: StepCall<Project> = async (payload) => {
  const returnResult: PluginResult = {
    status: {
      result: 'OK',
    },
  }
  const warnReasons: string[] = []
  try {
    const project = payload.args
    const projectName = project.slug
    const { vault: vaultApi, keycloak: keycloakApi } = payload.apis

    const publishRoRobotProject = project.store.registry?.publishProjectRobot
    const publishRoRobotConfig = payload.config.registry?.publishProjectRobot
    const createProjectRobot
      = specificallyEnabled(publishRoRobotProject)
        || (specificallyEnabled(publishRoRobotConfig)
          && !specificallyDisabled(publishRoRobotProject))

    const quotaHardLimit
      = project.store.registry?.quotaHardLimit
        || payload.config.registry?.quotaHardLimit
    const quotaHardLimitBytes = quotaHardLimit
      ? bytes.parse(quotaHardLimit)
      : undefined

    const [projectCreated, oidcGroup] = await Promise.all([
      createProject(
        projectName,
        quotaHardLimitBytes === 1 ? undefined : quotaHardLimitBytes,
      ),
      keycloakApi.getProjectGroupPath(),
    ])
    const api = getApi()

    if (!projectCreated.project_id)
      throw new Error('Unable to retrieve project_id')
    const projectId = projectCreated.project_id

    await Promise.all([
      ensureRobot(projectName, projectId, roRobotName, vaultApi, roAccess, api), // cette ligne en premier sinon ça foire au dessus
      ensureRobot(projectName, projectId, rwRobotName, vaultApi, rwAccess, api),
      addProjectGroupMember(projectName, oidcGroup),
      addRetentionPolicy(projectName, projectId),
      createProjectRobot
        ? ensureRobot(projectName, projectId, projectRobotName, vaultApi, roAccess, api)
        : deleteRobot(projectName, projectId, projectRobotName, vaultApi, api),
    ])
    returnResult.status.message = `Created${createProjectRobot ? ' , with project robot' : ''}`
    returnResult.store = {
      projectId: projectCreated.project_id,
    }
    if (warnReasons.length) {
      returnResult.status.result = 'WARNING'
      returnResult.status.message = warnReasons.join(', ')
    }
    logger.info({ action: 'createDsoProject', projectSlug: projectName, result: returnResult.status.result, createProjectRobot }, 'Hook done')
    return returnResult
  } catch (error) {
    logger.error({ action: 'createDsoProject', projectSlug: payload.args.slug, err: error }, 'Hook failed')
    return {
      error,
      status: {
        result: 'KO',
        message: 'An unexpected error occured',
      },
    }
  }
}

export const deleteDsoProject: StepCall<Project> = async (payload) => {
  try {
    const project = payload.args
    const projectName = project.slug

    await deleteProject(projectName)

    logger.info({ action: 'deleteDsoProject', projectSlug: projectName, outcome: 'deleted' }, 'Hook done')
    return {
      status: {
        result: 'OK',
        message: 'Deleted',
      },
    }
  } catch (error) {
    logger.error({ action: 'deleteDsoProject', projectSlug: payload.args.slug, err: error }, 'Hook failed')
    return {
      error,
      status: {
        result: 'KO',
        message: 'An unexpected error occured',
      },
    }
  }
}

export const getProjectSecrets: StepCall<ProjectLite> = async ({
  args: project,
  apis: { vault: vaultApi },
  config,
}) => {
  logger.debug({ action: 'getProjectSecrets', projectSlug: project.slug }, 'Hook done')
  const publishRoRobotProject = project.store.registry?.publishProjectRobot
  const publishRoRobotConfig = config.registry?.publishProjectRobot
  const projectRobotEnabled
    = publishRoRobotProject === ENABLED
      || (publishRoRobotConfig === ENABLED
        && (!publishRoRobotProject || publishRoRobotProject === DEFAULT))

  const VaultRobotSecret = projectRobotEnabled
    ? ((await vaultApi.read(`REGISTRY/${projectRobotName}`, {
        throwIfNoEntry: false,
      })) as { data: VaultRobotSecret } | undefined)
    : undefined
  let secrets: { [x: string]: string } = {
    'Registry base path': `${getConfig().host}/${project.slug}/`,
  }

  if (projectRobotEnabled) {
    secrets = VaultRobotSecret?.data
      ? {
          ...secrets,
          ...VaultRobotSecret.data,
        }
      : {
          ...secrets,
          '/!\\': 'Vous n\'avez pas de robot de lecture veuillez reprovisionner',
        }
  }
  return {
    status: {
      result: 'OK',
    },
    secrets,
  }
}
