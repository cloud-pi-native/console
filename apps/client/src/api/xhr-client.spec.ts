import { vi, describe, it, expect } from 'vitest'
import { apiClient } from './xhr-client.js'

vi.mock('@/utils/keycloak/keycloak.ts', () => ({
  getKeycloak: () => ({
    token: 'token',
    loadUserProfile: vi.fn(),
    updateToken: vi.fn(),
  }),
}))

describe('xhr-client', () => {
  describe('Request interceptor', () => {
    it('Should return config if url = "/api/v1/version"', async () => {
      const config = {
        url: '/api/v1/version',
      }

      const fullfiled = await apiClient.interceptors.request.handlers[0].fulfilled(config)
      expect(fullfiled).toMatchObject(config)
    })

    it('Should add token to the request', async () => {
      const config = {
        url: '/projects',
        headers: {},
      }

      const fullfiled = await apiClient.interceptors.request.handlers[0].fulfilled(config)
      expect(fullfiled.headers).toHaveProperty('Authorization', 'Bearer token')
    })

    it('Should return an error if the request', async () => {
      const error = new Error('Request throw an error')
      let rejected
      await apiClient.interceptors.request.handlers[0].rejected(error).catch(error => { rejected = error })

      expect(rejected).toEqual(error)
    })
  })

  describe('Response interceptor', () => {
    it('Should throw error with specific message if response status >= 400', async () => {
      const message = 'Echec de réponse du serveur'
      const res = {
        response: { status: 500, data: message },
      }

      const rejectedRes = apiClient.interceptors.response.handlers[0].rejected(res)
      expect(rejectedRes).rejects.toMatchObject(new Error(message))
    })

    it('Should throw error with message if response status is >= 400', async () => {
      const message = 'Message d\'erreur personnalisé'
      const res = {
        response: { status: 409, data: message },
      }

      const rejectedRes = apiClient.interceptors.response.handlers[0].rejected(res)
      expect(rejectedRes).rejects.toMatchObject(new Error(message))
    })

    it('Should throw error with statusText if response status is >= 400', async () => {
      const statusText = 'failed'
      const res = {
        response: { status: 402, statusText },
      }

      const rejectedRes = apiClient.interceptors.response.handlers[0].rejected(res)
      expect(rejectedRes).rejects.toMatchObject(new Error(statusText))
    })

    it('Should throw error with specific message if error code is ECONNABORTED', async () => {
      const res = {
        response: { status: 400 },
        code: 'ECONNABORTED',
      }

      const rejectedRes = apiClient.interceptors.response.handlers[0].rejected(res)
      expect(rejectedRes).rejects.toMatchObject(new Error('Echec de réponse du serveur'))
    })

    it('Should throw error with specific message if res status is >= 500', async () => {
      const res = {
        response: { status: 500 },
      }

      const rejectedRes = apiClient.interceptors.response.handlers[0].rejected(res)
      expect(rejectedRes).rejects.toMatchObject(new Error('Echec de réponse du serveur'))
    })

    it('Should return res if promise is resolve', async () => {
      const res = {
        data: {},
      }

      const fulfilled = await apiClient.interceptors.response.handlers[0].fulfilled(res)
      expect(fulfilled).toMatchObject(res)
    })

    it('Should throw error an authentication error if status = 401', async () => {
      const message = 'Echec d\'identification'
      const res = {
        response: { status: 401 },
      }

      const rejectedRes = await apiClient.interceptors.response.handlers[0].rejected(res).catch(error => error)
      expect(rejectedRes).toMatchObject(new Error(message))
    })
  })
})
