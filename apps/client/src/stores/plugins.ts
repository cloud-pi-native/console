import { defineStore } from 'pinia'
import type { PluginsUpdateBody, ProjectService } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const usePluginsConfigStore = defineStore('plugins', () => {
  const services: ProjectService[] = []

  const getPluginsConfig = () => apiClient.SystemPlugin.getPluginsConfig()
    .then((response: any) => extractData(response, 200))

  const updatePluginsConfig = (body: PluginsUpdateBody) => apiClient.SystemPlugin.updatePluginsConfig({ body })
    .then((response: any) => extractData(response, 204))

  return {
    services,
    getPluginsConfig,
    updatePluginsConfig,
  }
})
