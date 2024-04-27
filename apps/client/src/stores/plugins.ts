import { defineStore } from 'pinia'
import api from '@/api/index.js'
import type { PluginsUpdateBody, ProjectService } from '@cpn-console/shared'

export const usePluginsConfigStore = defineStore('plugins', () => {
  const services: ProjectService[] = []
  const getPluginsConfig = async () => {
    const res = await api.getPluginsConfig()
    if (!res) return []
    return res
  }
  const updatePluginsConfig = async (data: PluginsUpdateBody) => {
    return await api.updatePluginsConfig(data)
  }

  return {
    services,
    getPluginsConfig,
    updatePluginsConfig,
  }
})
