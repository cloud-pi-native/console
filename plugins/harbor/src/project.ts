import axios from 'axios'
import { getAxiosOptions } from './functions.js'
import { Project } from '@cpn-console/hooks'

export const createProject = async (projectName: Project) => {
  try {
    const existingProject = await axios({
      ...getAxiosOptions(),
      url: `projects/${projectName}`,
      method: 'get',
      headers: {
        'X-Is-Resource-Name': true,
      },
    })
    return existingProject.data
  } catch (error) { // Create project if not exist
    await axios({
      ...getAxiosOptions(),
      url: 'projects',
      method: 'post',
      data: {
        project_name: projectName,
        metadata: {
          auto_scan: 'true',
        },
      },
    })
    const newProject = await axios({
      ...getAxiosOptions(),
      url: `projects/${projectName}`,
      method: 'get',
    })
    return newProject.data
  }
}

const removeRepositories = async (projectName: Project) => {
  const repositories = await axios({
    ...getAxiosOptions(),
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
      ...getAxiosOptions(),
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

export const deleteProject = async (projectName: Project) => {
  const project = await axios({
    ...getAxiosOptions(),
    url: `projects/${projectName}`,
    headers: {
      'X-Is-Resource-Name': true,
    },
    validateStatus: status => [200, 404].includes(status),
  })
  if (project.status === 200) {
    await removeRepositories(projectName)
    await axios({
      ...getAxiosOptions(),
      url: `projects/${projectName}`,
      method: 'delete',
      headers: {
        'X-Is-Resource-Name': true,
      },
    })
  }
}
