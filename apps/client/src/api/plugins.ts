import { apiClient, extractData } from './xhr-client.js'

export const getPluginsConfig = () =>
  apiClient.SystemPlugin.getPluginsConfig()
    .then(response => extractData(response, 200))

export const updatePluginsConfig = (body: any) =>
  apiClient.SystemPlugin.updatePluginsConfig({ body })
    .then(response => extractData(response, 204))
