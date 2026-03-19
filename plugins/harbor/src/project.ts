import type { Project as HarborProject, Quota } from './api/Api.js'
import { getApi } from './utils.js'

export async function createProject(projectName: string, storageLimit: number = -1): Promise<HarborProject> {
  const api = getApi()
  const existingProject = await api.projects.getProject(projectName, {
    headers: {
      'X-Is-Resource-Name': true,
    },
    validateStatus: () => true,
  })

  if (existingProject.status === 200) {
    const projectId = existingProject.data.project_id as number
    const refQuotas = await api.quotas.listQuotas({
      reference_id: String(projectId),
    })
    const hardQuota = refQuotas.data.find(quota => quota.ref?.id === projectId) as Quota

    if (hardQuota.hard.storage !== storageLimit) {
      await api.quotas.updateQuota(projectId, {
        hard: {
          storage: storageLimit,
        },
      })
    }
    return existingProject.data
  }

  await api.projects.createProject({
    project_name: projectName,
    metadata: {
      auto_scan: 'true',
    },
    storage_limit: storageLimit,
  }, {
    validateStatus: () => true,
  })

  const newProject = await api.projects.getProject(projectName)
  return newProject.data
}

async function removeRepositories(projectName: string) {
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

export async function deleteProject(projectName: string) {
  const api = getApi()
  const project = await api.projects.getProject(projectName, {
    validateStatus: status => [200, 404].includes(status),
  })

  if (project.status === 200) {
    await removeRepositories(projectName)
    await api.projects.deleteProject(projectName)
  }
}
