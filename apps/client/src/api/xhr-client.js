import axios from 'axios'
import { getKeycloak } from '@/utils/keycloak/keycloak'
import router from '@/router/index.js'

export const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 5000,
})

apiClient.interceptors.request.use(async function addAuthHeader (config) {
  if (config.url?.startsWith('/version') || config.url?.startsWith('/login')) {
    return config
  }
  const keycloak = getKeycloak()

  if (process.env.NODE_ENV === 'test' && process.env.CT === 'true') {
    return config
  }

  await keycloak.updateToken()

  const token = keycloak.token
  if (token) {
    Object.assign(config.headers, {
      Authorization: `Bearer ${token}`,
    })
  }
  return config
}, function (error) {
  return Promise.reject(error)
})

apiClient.interceptors.response.use(function (response) {
  return response
}, function (error) {
  const response = error?.response
  const isUnauthorized = response?.status === 401
  if (isUnauthorized) {
    const customError = new Error('Echec d\'identification')
    customError.httpCode = 401
    return Promise.reject(customError)
  }
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('Network Error') || (response?.status >= 500 && !error?.message)) {
    const customError = new Error('Echec de réponse du serveur')
    return Promise.reject(customError)
  }
  if (response?.data?.error === 'invalid_grant') {
    const customError = new Error(response?.body?.error_description)
    router.push('/login')
    return Promise.reject(customError)
  }
  const apiError = new Error(response?.data || response?.statusText || error?.message || error)
  apiError.statusCode = response?.status
  return Promise.reject(apiError)
})
