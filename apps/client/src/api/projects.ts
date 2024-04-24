import type { CreateProjectBody, UpdateProjectBody, PatchProjectBody } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

// Project
export const createProject = async (data: CreateProjectBody) => {
  const response = await apiClient.Projects.createProject({ body: data })
  if (response.status === 201) return response.body
}

export const getUserProjects = async () => {
  const response = await apiClient.Projects.getProjects()
  if (response.status === 200) return response.body
}

export const updateProject = async (projectId: string, data: UpdateProjectBody) => {
  const response = await apiClient.Projects.updateProject({ body: data, params: { projectId } })
  if (response.status === 200) return response.body
}

export const replayHooks = async (projectId: string) => {
  const response = await apiClient.Projects.replayHooksForProject({ params: { projectId } })
  if (response.status === 204) return response.body
}

export const archiveProject = async (projectId: string) => {
  const response = await apiClient.Projects.archiveProject({ params: { projectId } })
  if (response.status === 204) return response.body
}

export const getProjectSecrets = async (projectId: string) => {
  const response = await apiClient.Projects.getProjectSecrets({ params: { projectId } })
  if (response.status === 200) return response.body
}

// Admin - Projects
export const getAllProjects = async () => {
  const response = await apiClient.ProjectsAdmin.getAllProjects()
  if (response.status === 200) return response.body
}

export const handleProjectLocking = async (projectId: string, lock: PatchProjectBody['lock']) => {
  const response = await apiClient.ProjectsAdmin.patchProject({ body: { lock }, params: { projectId } })
  if (response.status === 200) return response.body
}

export const generateProjectsData = async () => {
  const response = await apiClient.ProjectsAdmin.getProjectsData()
  return response.body
}
