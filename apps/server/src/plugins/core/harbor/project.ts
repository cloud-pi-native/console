import axios from 'axios'
import { axiosOptions } from './index.js'

export const createProject = async (projectName) => {
  try {
    const existingProject = await axios({
      ...axiosOptions,
      url: `projects/${projectName}`,
      method: 'get',
      headers: {
        'X-Is-Resource-Name': true,
      },
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

const removeRepositories = async (projectName) => {
  const repositories = await axios({
    ...axiosOptions,
    method: 'get',
    url: `projects/${projectName}/repositories`,
    headers: {
      'X-Is-Resource-Name': true,
    },
    params: {
      page_size: 100,
    },
  })

  for (const repo of repositories.data) {
    const repoName = repo.name.split('/').slice(1).join('/')
    await axios({
      ...axiosOptions,
      method: 'delete',
      url: `projects/${projectName}/repositories/${repoName}`,
      headers: {
        'X-Is-Resource-Name': true,
      },
    })
  }
  if (repositories.headers['x-total-count'] > repositories.data.length) {
    await removeRepositories(projectName)
  }
}

export const deleteProject = async (projectName) => {
  const project = await axios({
    ...axiosOptions,
    url: `projects/${projectName}`,
    headers: {
      'X-Is-Resource-Name': true,
    },
    validateStatus: status => [200, 404].includes(status),
  })
  await removeRepositories(projectName)
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
}
