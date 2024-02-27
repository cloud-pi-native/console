import type { CreateProjectDto, GetAllProjectsOutputDto, ProjectInfos, ProjectParams, UpdateProjectDto } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

// Project
export const createProject = async (data: CreateProjectDto) => {
  const response = await apiClient.post('/projects', data)
  return response.data
}

export const getUserProjects = async (): Promise<Required<ProjectInfos>[]> => {
  const response = await apiClient.get('/projects')
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

// Admin - Projects
export const getAllProjects = async (): Promise<GetAllProjectsOutputDto> => {
  const response = await apiClient.get('/admin/projects')
  return response.data
}

export const handleProjectLocking = async (projectId: string, lock: boolean) => {
  const response = await apiClient.patch(`/admin/projects/${projectId}`, { lock })
  return response.data
}

export const generateProjectsData = async () => {
  const response = await apiClient.get('/admin/projects/data')
  return response.data
}
