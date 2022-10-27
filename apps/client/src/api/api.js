import { apiClient } from './xhr-client.js'

// Project
export const getProjects = async () => {
  const response = await apiClient.get('/projects')
  return response.data
}

export const getProjectById = async (id) => {
  const response = await apiClient.get(`/projects/${id}`)
  return response.data
}

export const createProject = async (data) => {
  const response = await apiClient.post('/projects', data)
  return response.data
}
