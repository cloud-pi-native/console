import { apiClient } from './xhr-client.js'

// Connection
export const requestToken = async (credentials) => {
  const response = await apiClient.post('/auth', credentials)
  return response.data
}

export const verifyToken = async (token) => {
  const response = await apiClient.get('/auth/verify-token', { token })
  return response.data
}
