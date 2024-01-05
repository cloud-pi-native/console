import type { CreateProjectDto, GetAllProjectsOutputDto, ProjectInfos, ProjectParams, UpdateProjectDto } from '@dso-console/shared'
import { apiClient } from './xhr-client.js'

// Project
export const createProject = async (data: CreateProjectDto) => {
  const response = await apiClient.post('/projects', data)
  return response.data
}

type GetProjectsOptions = {
  filter: 'user' | 'admin'
  limit: number
  skip: number
}
export const getProjects = async (options: GetProjectsOptions): Promise<Required<ProjectInfos>[]> => {
  const opts = {
    filter: options.filter,
    // limit: `${options.limit}`,
    // skip: `${options.skip}`,
  }
  const response = await apiClient.get(`/projects?${new URLSearchParams(opts).toString()}`)
  return response.data
}

export const getUserProjectById = async (projectId: ProjectParams['projectId']) => {
  const response = await apiClient.get(`/projects/${projectId}`)
  return response.data
}

export const updateProject = async (projectId: ProjectParams['projectId'], data: UpdateProjectDto) => { // TODO: Promise<ProjectOutputDto>
  const response = await apiClient.put(`/projects/${projectId}`, data)
  return response.data
}

export const archiveProject = async (projectId: ProjectParams['projectId']): Promise<void> => { // TODO: Promise<ProjectOutputDto | null> ou pas ?
  await apiClient.delete(`/projects/${projectId}`)
}

export const getProjectSecrets = async (projectId: ProjectParams['projectId']) => {
  const response = await apiClient.get(`/projects/${projectId}/secrets`)
  return response.data
}

// // Admin - Projects
// export const getAllProjects = async (): Promise<GetAllProjectsOutputDto> => {
//   const response = await apiClient.get('/admin/projects')
//   return response.data
// }

export const handleProjectLocking = async (projectId: string, lock: boolean) => {
  const response = await apiClient.patch(`/admin/projects/${projectId}`, { lock })
  return response.data
}

export const generateProjectsData = async () => {
  const response = await apiClient.get('/admin/projects/data')
  return response.data
}
