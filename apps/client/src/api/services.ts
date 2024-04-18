import { apiClient } from './xhr-client.js'

export const checkServicesHealth = async () => {
  const response = await apiClient.Services.getServiceHealth()
  if (response.status === 200) return response.body
}
