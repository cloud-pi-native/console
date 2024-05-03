import { apiClient } from './xhr-client.js'

export const getPluginsConfig = async () => {
  const response = await apiClient.SystemPlugin.getPluginsConfig()
  if (response.status === 200) return response.body
}

export const updatePluginsConfig = async (body: any) => {
  const response = await apiClient.SystemPlugin.updatePluginsConfig({ body })
  if (response.status === 204) return response.body
}
