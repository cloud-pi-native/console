// @ts-ignore pas de typage disponible pour le paquet bytes
import bytes from 'bytes'
import { type Project, type ProjectLite, type StepCall, parseError, specificallyDisabled, specificallyEnabled } from '@cpn-console/hooks'
import { DEFAULT, ENABLED } from '@cpn-console/shared'
import { getApi, projectRobotName, roRobotName, rwRobotName } from './utils.js'
import { createProject, deleteProject } from './project.js'
import { addProjectGroupMember } from './permission.js'
import type { VaultRobotSecret } from './robot.js'
import { deleteRobot, ensureRobot, roAccess, rwAccess } from './robot.js'
import { getSecretObject } from './kubeSecret.js'
import getConfig from './config.js'

export const createDsoProject: StepCall<Project> = async (payload) => {
  try {
    const project = payload.args
    const projectName = `${project.organization.name}-${project.name}`
    const { vault: vaultApi, keycloak: keycloakApi } = payload.apis

    const publishRoRobotProject = project.store.registry?.publishProjectRobot
    const publishRoRobotConfig = payload.config.registry?.publishProjectRobot
    const createProjectRobot = specificallyEnabled(publishRoRobotProject) || (specificallyEnabled(publishRoRobotConfig) && !specificallyDisabled(publishRoRobotProject))

    const quotaHardLimit = project.store.registry?.quotaHardLimit || payload.config.registry?.quotaHardLimit
    const quotaHardLimitBytes = quotaHardLimit
      ? bytes.parse(quotaHardLimit)
      : undefined

    const [projectCreated, oidcGroup] = await Promise.all([
      createProject(projectName, quotaHardLimitBytes === 1 ? undefined : quotaHardLimitBytes),
      keycloakApi.getProjectGroupPath(),
    ])
    const api = getApi()

    const [creds] = await Promise.all([
      ensureRobot(projectName, roRobotName, vaultApi, roAccess, api), // cette ligne en premier sinon ça foire au dessus
      ensureRobot(projectName, rwRobotName, vaultApi, rwAccess, api),
      addProjectGroupMember(projectName, oidcGroup),
      createProjectRobot
        ? ensureRobot(projectName, projectRobotName, vaultApi, roAccess, api)
        : deleteRobot(projectName, projectRobotName, vaultApi, api),
    ])

    await payload.apis.kubernetes.applyResourcesInAllEnvNamespaces({
      group: '',
      name: 'registry-pull-secret',
      plural: 'secrets',
      version: 'v1',
      body: getSecretObject({ DOCKER_CONFIG: creds.DOCKER_CONFIG }),
    })

    if (!projectCreated.project_id) throw new Error('Unable to retrieve project_id')
    return {
      status: {
        result: 'OK',
        message: `Created${createProjectRobot ? ' , with project robot' : ''}`,
      },
      store: {
        projectId: projectCreated.project_id,
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: 'An unexpected error occured',
      },
    }
  }
}

export const deleteDsoProject: StepCall<Project> = async (payload) => {
  try {
    const project = payload.args
    const projectName = `${project.organization.name}-${project.name}`

    await deleteProject(projectName)

    return {
      status: {
        result: 'OK',
        message: 'Deleted',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: 'An unexpected error occured',
      },
    }
  }
}

export const getProjectSecrets: StepCall<ProjectLite> = async ({ args: project, apis: { vault: vaultApi }, config }) => {
  const publishRoRobotProject = project.store.registry?.publishProjectRobot
  const publishRoRobotConfig = config.registry?.publishProjectRobot
  const projectRobotEnabled = publishRoRobotProject === ENABLED
    || (publishRoRobotConfig === ENABLED && (!publishRoRobotProject || publishRoRobotProject === DEFAULT))

  const VaultRobotSecret = projectRobotEnabled
    ? await vaultApi.read(`REGISTRY/${projectRobotName}`, { throwIfNoEntry: false }) as { data: VaultRobotSecret } | undefined
    : undefined
  let secrets: { [x: string]: string } = {
    'Registry base path': `${getConfig().host}/${project.organization.name}-${project.name}/`,
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
