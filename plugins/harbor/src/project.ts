import { getApi } from './utils.js'
import { Project as HarborProject } from './api/Api.js'

export const createProject = async (projectName: string): Promise<HarborProject> => {
  const api = getApi()
  try {
    const existingProject = await api.projects.getProject(projectName, {
      headers: {
        'X-Is-Resource-Name': true,
      },
    })
    return existingProject.data
  } catch (error) { // Create project if not exist
    await api.projects.createProject({
      project_name: projectName,
      metadata: {
        auto_scan: 'true',
      },
    })
    const newProject = await api.projects.getProject(projectName)
    return newProject.data
  }
}

const removeRepositories = async (projectName: string) => {
  const api = getApi()
  const repositories = await api.projects.listRepositories(projectName, { page_size: 100 })

  for (const repo of repositories.data) {
    // TODO mauvais swagger name existe forcément
    const repoName = repo.name?.split('/').slice(1).join('/') as string
    await api.projects.deleteRepository(projectName, repoName)
  }
  if (repositories.headers['x-total-count'] > repositories.data.length) {
    await removeRepositories(projectName)
  }
}

export const deleteProject = async (projectName: string) => {
  const api = getApi()
  const project = await api.projects.getProject(projectName, {
    validateStatus: status => [200, 404].includes(status),
  })

  if (project.status === 200) {
    await removeRepositories(projectName)
    await api.projects.deleteProject(projectName)
  }
}
