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

export const addRepo = async (id, data) => {
  const response = await apiClient.post(`/projects/${id}/repos`, data)
  return response.data
}

export const addUser = async (id, data) => {
  const response = await apiClient.post(`/projects/${id}/users`, data)
  return response.data
}

export const removeUser = async (id, data) => {
  const response = await apiClient.delete(`/projects/${id}/users`, { data })
  return response.data
}

export const getUsers = async () => {
  const response = await apiClient.get('/keycloakinfo')
  return response.data
}
