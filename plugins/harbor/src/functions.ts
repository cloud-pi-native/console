import { getConfig } from './utils.js'
import { createProject, deleteProject } from './project.js'
import { addProjectGroupMember } from './permission.js'
import { createCiRobot, getCiRobot, regenerateCiRobot } from './robot.js'
import { type StepCall, type Project, type ProjectLite, parseError } from '@cpn-console/hooks'
import { RobotCreated } from './api/Api.js'
import { getSecretObject } from './kubeSecret.js'

type VaultRegistrySecret = {
  // {"auths":{"registry-host.com":{"auth":"<the TOKEN>","email":""}}},
  DOCKER_CONFIG: string
  // registry-host.com,
  HOST: string
  TOKEN: string,
  // robot$<project-name>+ci
  USERNAME: string
}

const toVaultSecret = (robot: Required<RobotCreated>): VaultRegistrySecret => {
  const auth = `${robot.name}:${robot.secret}`
  const buff = Buffer.from(auth)
  const b64auth = buff.toString('base64')
  return {
    DOCKER_CONFIG: JSON.stringify({
      auths: {
        [getConfig().host]: {
          auth: b64auth,
          email: '',
        },
      },
    }),
    HOST: getConfig().host,
    TOKEN: robot.secret,
    USERNAME: robot.name,
  }
}

export const createDsoProject: StepCall<Project> = async (payload) => {
  try {
    const project = payload.args
    const projectName = `${project.organization.name}-${project.name}`
    const vaultApi = payload.apis.vault

    const projectCreated = await createProject(projectName)
    const oidcGroup = await payload.apis.keycloak.getProjectGroupPath()
    await addProjectGroupMember(projectName, oidcGroup)
    const robot = await getCiRobot(projectName)
    const vaultRegistrySecret = await payload.apis.vault.read('REGISTRY', { throwIfNoEntry: false }) as { data: VaultRegistrySecret } | undefined
    const creds: VaultRegistrySecret = !vaultRegistrySecret
      ? robot
        ? toVaultSecret(await createCiRobot(projectName) as Required<RobotCreated>)
        : toVaultSecret(await regenerateCiRobot(projectName) as Required<RobotCreated>)
      : vaultRegistrySecret.data

    vaultApi.write(creds, 'REGISTRY')
    await payload.apis.vault.write(creds, 'REGISTRY')

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
        message: 'Created',
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

export const getProjectSecrets: StepCall<ProjectLite> = async ({ args: project }) => {
  return {
    status: {
      result: 'OK',
    },
    secrets: {
      'Registry base path': `${getConfig().host}/${project.organization.name}-${project.name}/`,
    },
  }
}
