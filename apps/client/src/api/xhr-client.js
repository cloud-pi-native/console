import { getKeycloak } from '@/utils/keycloak/init-sso.js'
import axios from 'axios'

export const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 5000,
})

apiClient.interceptors.request.use(
  request => {
    if (request.url === '/auth' || request.url?.startsWith('/version')) {
      return request
    }
    // TODO : gestion token avec keycloak
    const token = window.localStorage.getItem('token')
    console.log({ kc: getKeycloak() })
    if (token) {
      Object.assign(request.headers, {
        Authorization: `Bearer ${token}`,
      })
    }
    return request
  },

  error => {
    return Promise.reject(error)
  })

apiClient.interceptors.response.use(
  response => {
    return Promise.resolve(response)
  },

  error => {
    const response = error?.response
    const isUnauthorized = response?.status === 401
    if (isUnauthorized) {
      const customError = new Error('Incorrect authentication')
      customError.httpCode = 401
      return Promise.reject(customError)
    }
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('Network Error')) {
      const customError = new Error('Unable to communicate with the server')
      return Promise.reject(customError)
    }
    const apiError = new Error(response?.data?.message || response?.statusText || error?.message)
    apiError.statusCode = response?.status
    return Promise.reject(apiError)
  },
)
