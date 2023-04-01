import axios from 'axios'
import { axiosOptions } from './index.js'

export const createProject = async (projectName) => {
  try {
    const existingProject = await axios({
      ...axiosOptions,
      url: `projects/${projectName}`,
      method: 'get',
    })
    return existingProject.data
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
    return newProject.data
  }
}

export const deleteProject = async (projectName) => {
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
