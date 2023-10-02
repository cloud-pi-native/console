import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { getKeycloak } from '@/utils/keycloak/keycloak'
import router from '@/router/index.js'

export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 60000,
})

apiClient.interceptors.request.use(async function addAuthHeader (config: InternalAxiosRequestConfig) {
  if (config.url?.startsWith('/api/v1/version') || config.url?.startsWith('/login')) {
    return config
  }
  const keycloak = getKeycloak()

  if (process.env.NODE_ENV === 'test' && process.env.CT === 'true') {
    return config
  }

  await keycloak.updateToken(120)

  const token: string | undefined = keycloak.token
  if (token) {
    Object.assign(config.headers, {
      Authorization: `Bearer ${token}`,
    })
  }
  return config
}, function (error) {
  return Promise.reject(error)
})

export type CustomError = Error & {
  httpCode?: number,
  statusCode?: number,
}

apiClient.interceptors.response.use(function (response: AxiosResponse): AxiosResponse {
  return response
}, function (error): Promise<never> {
  const response = error.response
  const isUnauthorized: boolean = response?.status === 401
  if (isUnauthorized) {
    const customError: CustomError = new Error('Echec d\'identification')
    customError.httpCode = 401
    return Promise.reject(customError)
  }
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('Network Error') || (response?.status >= 500 && !error?.message)) {
    const customError: CustomError = new Error('Echec de réponse du serveur')
    return Promise.reject(customError)
  }
  if (response?.data?.error === 'invalid_grant') {
    const customError: CustomError = new Error(response?.body?.error_description)
    router.push('/login')
    return Promise.reject(customError)
  }
  const apiError: CustomError = new Error(response?.data?.error || response?.data || response?.statusText || error?.message || error)
  apiError.statusCode = response?.status
  return Promise.reject(apiError)
})
