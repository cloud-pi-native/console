import axios from 'axios'
import {
  harborUser as username,
  harborPassword as password,
  harborUrl,
} from './utils.js'
import { createProject, deleteProject } from './project.js'
import { addProjectGroupMember } from './permission.js'
import { createRobot } from './robot.js'
import type { StepCall } from '@/plugins/hooks/hook.js'
import type { ArchiveProjectExecArgs, CreateProjectExecArgs } from '@/plugins/hooks/project.js'

export const axiosOptions = {
  baseURL: `${harborUrl}/api/v2.0/`,
  auth: {
    username,
    password,
  },
}

export const check = async () => {
  let health
  try {
    health = await axios({
      ...axiosOptions,
      url: 'health',
    })
    if (health.data.status !== 'healthy') {
      return {
        status: {
          result: 'KO',
          message: health.data.components,
        },
      }
    }
    return {
      status: {
        result: 'OK',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: error.message,
      },
    }
  }
}

export const createDsoProject: StepCall<CreateProjectExecArgs> = async (payload) => {
  try {
    if (!payload.vault) throw Error('no Vault available')
    const { project, organization } = payload.args
    const projectName = `${organization}-${project}`

    const projectCreated = await createProject(projectName)
    // TODO : à revoir, pbmatique que maintainer puisse push des images
    // // give harbor project member Maintainer role (can scan images)
    // const projectMember = await addProjectGroupMember(projectName, 4)
    const projectMember = await addProjectGroupMember(projectName)
    const robot = await createRobot(projectName)
    const auth = `${robot.name}:${robot.secret}`
    const buff = Buffer.from(auth)
    const b64auth = buff.toString('base64')
    const registryHost = harborUrl.split('://')[1]
    const dockerConfigStr = JSON.stringify({
      auths: {
        [registryHost]: {
          auth: b64auth,
          email: '',
        },
      },
    })
    await payload.vault.write('REGISTRY', {
      TOKEN: robot.secret,
      USERNAME: robot.name,
      HOST: registryHost,
      DOCKER_CONFIG: dockerConfigStr,
    })
    return {
      status: {
        result: 'OK',
        message: 'Created',
      },
      result: {
        project: projectCreated,
        projectMember,
        robot,
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: error.message,
      },
      error: JSON.stringify(error),
    }
  }
}

export const archiveDsoProject: StepCall<ArchiveProjectExecArgs> = async (payload) => {
  try {
    const { project, organization } = payload.args
    const projectName = `${organization}-${project}`

    await deleteProject(projectName)

    return {
      status: {
        result: 'OK',
        message: 'Deleted',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: error.message,
      },
      error: JSON.stringify(error),
    }
  }
}
