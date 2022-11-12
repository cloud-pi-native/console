import axios from 'axios'
import { getKeycloak } from '@/utils/keycloak/init.js'
import router from '@/router/index.js'

export const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 5000,
})

apiClient.interceptors.request.use(
  async request => {
    if (request.url?.startsWith('/version')) {
      return request
    }
    const keycloak = getKeycloak()
    try {
      await keycloak.updateToken()
    } catch (e) {
      return router.push('/login')
    }
    const token = keycloak.token
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
    if (response?.data?.error === 'invalid_grant') {
      const customError = new Error(response?.body?.error_description)
      router.push('/login')
      return Promise.reject(customError)
    }
    const apiError = new Error(response?.data?.message || response?.data || response?.statusText)
    apiError.statusCode = response?.status
    return Promise.reject(apiError)
  },
)
