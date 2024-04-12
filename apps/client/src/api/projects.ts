import type { CreateProjectDto, ProjectParams, UpdateProjectDto } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

// Project
export const createProject = async (data: CreateProjectDto) => {
  const response = await apiClient.Projects.createProject({ body: data })
  return response.body
}

export const getUserProjects = async () => {
  const response = await apiClient.Projects.getProjects()
  return response.body
}

export const updateProject = async (projectId: ProjectParams['projectId'], data: UpdateProjectDto) => {
  const response = await apiClient.Projects.updateProject({ body: data, params: { projectId } })
  return response.body
}

export const replayHooks = async (projectId: ProjectParams['projectId']) => {
  const response = await apiClient.Projects.replayHooksForProject({ params: { projectId } })
  return response.body
}

export const archiveProject = async (projectId: ProjectParams['projectId']) => {
  await apiClient.Projects.archiveProject({ params: { projectId } })
}

export const getProjectSecrets = async (projectId: ProjectParams['projectId']) => {
  const response = await apiClient.Projects.getProjectSecrets({ params: { projectId } })
  return response.body
}

// Admin - Projects
export const getAllProjects = async () => {
  const response = await apiClient.ProjectsAdmin.getAllProjects()
  return response.body
}

export const handleProjectLocking = async (projectId: string, lock: boolean) => {
  const response = await apiClient.ProjectsAdmin.patchProject({ body: { lock }, params: { projectId } })
  return response.body
}

export const generateProjectsData = async () => {
  const response = await apiClient.ProjectsAdmin.getProjectsData()
  return response.body
}
