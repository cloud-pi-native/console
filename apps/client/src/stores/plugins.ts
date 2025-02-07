import { defineStore } from 'pinia'
import type { PluginsUpdateBody, ProjectService } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const usePluginsStore = defineStore('plugins', () => {
  const services: ProjectService[] = []

  const listPlugins = () => apiClient.SystemPlugin.listPlugins()
    .then(response => extractData(response, 200))

  const getPluginsConfig = () => apiClient.SystemPlugin.getPluginsConfig()
    .then(response => extractData(response, 200))

  const getPluginConfig = (name: string) => apiClient.SystemPlugin.getPluginConfig({ params: { name } })
    .then(response => extractData(response, 200))

  const getPluginReport = (name: string) => apiClient.SystemPlugin.getPluginReport({ params: { name } })
    .then(response => extractData(response, 200))

  const deletePluginReport = (name: string) => apiClient.SystemPlugin.deletePluginReport({ params: { name } })
    .then(response => extractData(response, 204))

  const updatePluginsConfig = (body: PluginsUpdateBody) => apiClient.SystemPlugin.updatePluginsConfig({ body })
    .then(response => extractData(response, 204))

  return {
    services,
    listPlugins,
    getPluginsConfig,
    getPluginConfig,
    getPluginReport,
    deletePluginReport,
    updatePluginsConfig,
  }
})
