import { roRobotName, getApi, getConfig, rwRobotName, projectRobotName } from './utils.js'
import { createProject, deleteProject } from './project.js'
import { addProjectGroupMember } from './permission.js'
import { VaultRobotSecret, rwAccess, ensureRobot, roAccess, deleteRobot } from './robot.js'
import { type StepCall, type Project, type ProjectLite, parseError, specificallyEnabled, specificallyDisabled } from '@cpn-console/hooks'
import { getSecretObject } from './kubeSecret.js'
import { DEFAULT, ENABLED } from '@cpn-console/shared'

export const createDsoProject: StepCall<Project> = async (payload) => {
  try {
    const project = payload.args
    const projectName = `${project.organization.name}-${project.name}`
    const { vault: vaultApi, keycloak: keycloakApi } = payload.apis

    const publishRoRobotProject = project.store.registry?.publishProjectRobot
    const publishRoRobotConfig = payload.config.registry?.publishProjectRobot
    const createProjectRobot = specificallyEnabled(publishRoRobotProject) || (specificallyEnabled(publishRoRobotConfig) && !specificallyDisabled(publishRoRobotProject))
    const [projectCreated, oidcGroup] = await Promise.all([
      createProject(projectName),
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
        message: error.message,
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
        message: error.message,
      },
    }
  }
}

export const getProjectSecrets: StepCall<ProjectLite> = async ({ args: project, apis: { vault: vaultApi }, config }) => {
  const publishRoRobotProject = project.store.registry?.publishProjectRobot
  const publishRoRobotConfig = config.registry?.publishProjectRobot
  const projectRobotEnabled = publishRoRobotProject === ENABLED ||
      (publishRoRobotConfig === ENABLED && (!publishRoRobotProject || publishRoRobotProject === DEFAULT))

  const VaultRobotSecret = projectRobotEnabled
    ? await vaultApi.read(`REGISTRY/${projectRobotName}`, { throwIfNoEntry: false }) as { data: VaultRobotSecret } | undefined
    : undefined
  let secrets: {[x:string]: string} = {
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
