import { apiClient, extractData } from './xhr-client.js'

export const checkServicesHealth = () =>
  apiClient.Services.getServiceHealth()
    .then(response => extractData(response, 200))
