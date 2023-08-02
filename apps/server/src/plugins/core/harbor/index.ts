import axios from 'axios'
import {
  harborUrl,
  harborUser as username,
  harborPassword as password,
} from '@/utils/env.js'
import { createProject, deleteProject } from './project.js'
import { addProjectGroupMember } from './permission.js'
import { createRobot } from './robot.js'

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

export const createDsoProject = async (payload) => {
  try {
    const { project, organization } = payload.args
    const projectName = `${organization}-${project}`

    const projectCreated = await createProject(projectName)
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
      vault: [{
        name: 'REGISTRY',
        data: {
          TOKEN: robot.secret,
          USERNAME: robot.name,
          HOST: registryHost,
          DOCKER_CONFIG: dockerConfigStr,
        },
      }],
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

export const archiveDsoProject = async (payload) => {
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
