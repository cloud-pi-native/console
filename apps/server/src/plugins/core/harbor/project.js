import axios from 'axios'
import { axiosOptions } from './index.js'
import { getRobotPermissions } from './utils.js'

export const createProject = async (payload) => {
  const { name, organization } = payload.args
  const projectName = `${organization}-${name}`

  try {
    try {
      const oldProject = await axios({
        ...axiosOptions,
        url: `projects/${projectName}`,
      })
      return {
        status: {
          result: 'OK',
          message: 'Already Exists',
        },
        result: {
          project: oldProject.data,
        },
      }
    } catch (error) { // Create project if not exist
      await axios({
        ...axiosOptions,
        url: 'projects',
        method: 'post',
        data: {
          project_name: projectName,
        },
      })
      const newProject = await axios({
        ...axiosOptions,
        url: `projects/${projectName}`,
        method: 'get',
      })
      const newRobot = await axios({
        ...axiosOptions,
        url: 'robots',
        method: 'post',
        data: getRobotPermissions(projectName),
      })
      return {
        status: {
          result: 'OK',
          message: 'Created',
        },
        result: {
          project: newProject.data,
          vault: [{
            name: 'QUAY',
            data: {
              QUAY_ROBOT_USERNAME: newRobot.data.name,
              QUAY_ROBOT_TOKEN: newRobot.data.secret,
            },
          }],
        },
      }
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: error.message,
        stack: error.stack,
      },
    }
  }
}

export const archiveProject = async (payload) => {
  const { name, organization } = payload.args
  const projectName = `${organization}-${name}`

  try {
    const project = await axios({
      ...axiosOptions,
      url: `projects/${projectName}`,
      headers: {
        'X-Is-Resource-Name': true,
      },
      validateStatus: status => [200, 404].includes(status),
    })
    if (project.status === 200) {
      await axios({
        ...axiosOptions,
        url: `projects/${projectName}`,
        method: 'delete',
        headers: {
          'X-Is-Resource-Name': true,
        },
      })
    }

    return {
      status: {
        result: 'OK',
        message: 'Deleted',
      },
      vault: [{ name: 'QUAY' }],
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
