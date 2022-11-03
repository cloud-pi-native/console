import { apiClient } from './xhr-client.js'

// Project
export const getUserProjects = async () => {
  const response = await apiClient.get('/projects')
  return response.data
}

export const getUserProjectById = async (id) => {
  const response = await apiClient.get(`/projects/${id}`)
  return response.data
}

export const createProject = async (data) => {
  const response = await apiClient.post('/projects', data)
  return response.data
}

export const updateProject = async (id, data) => {
  const response = await apiClient.put(`/projects/${id}`, data)
  return response.data
}
