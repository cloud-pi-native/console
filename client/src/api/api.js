import { apiClient } from './xhr-client.js'

// Connection
/**
 * @param {*} credentials
 * @returns {*}
 */
export const requestToken = async (credentials) => {
  const response = await apiClient.post('/auth', credentials)
  return response.data
}

/**
 * @param {*} token
 * @returns {*}
 */
export const verifyToken = async (token) => {
  const response = await apiClient.get('/auth/verify-token', { token })
  return response.data
}
