import { vi, describe, it, expect } from 'vitest'
import * as xhrClient from './xhr-client.js'

vi.mock('@/utils/keycloak/keycloak.js', () => ({
  getKeycloak: () => ({
    token: 'token',
    loadUserProfile: vi.fn(),
    updateToken: vi.fn(),
  }),
}))

describe('xhr-client', () => {
  describe('Request interceptor', () => {
    it('Should return config if url = "/version"', async () => {
      const config = {
        url: '/version',
      }

      const fullfiled = await xhrClient.apiClient.interceptors.request.handlers[0].fulfilled(config)
      expect(fullfiled).toMatchObject(config)
    })

    it('Should add token to the request', async () => {
      const config = {
        url: '/projects',
        headers: {},
      }

      const fullfiled = await xhrClient.apiClient.interceptors.request.handlers[0].fulfilled(config)
      expect(fullfiled.headers).toHaveProperty('Authorization', 'Bearer token')
    })

    it('Should return an error if the request', async () => {
      const error = new Error('Request throw an error')
      let rejected
      await xhrClient.apiClient.interceptors.request.handlers[0].rejected(error).catch(e => { rejected = e })

      expect(rejected).toEqual(error)
    })
  })

  describe('Response interceptor', () => {
    it('Should throw error with specific message if response status >= 400', async () => {
      const message = 'Error while responding'
      const res = {
        response: { status: 500, data: message },
      }

      const rejectedRes = xhrClient.apiClient.interceptors.response.handlers[0].rejected(res)
      expect(rejectedRes).rejects.toMatchObject(new Error(message))
    })

    it('Should throw error with message if response status is >= 400', async () => {
      const message = 'Error while responding'
      const res = {
        response: { status: 500, data: message },
      }

      const rejectedRes = xhrClient.apiClient.interceptors.response.handlers[0].rejected(res)
      expect(rejectedRes).rejects.toMatchObject(new Error(message))
    })

    it('Should throw error with statusText if response status is >= 400', async () => {
      const statusText = 'Error while responding'
      const res = {
        response: { status: 500, statusText },
      }

      const rejectedRes = xhrClient.apiClient.interceptors.response.handlers[0].rejected(res)
      expect(rejectedRes).rejects.toMatchObject(new Error(statusText))
    })

    it('Should throw error with specific message if error code is ECONNABORTED', async () => {
      const res = {
        response: { status: 400 },
        code: 'ECONNABORTED',
      }

      const rejectedRes = xhrClient.apiClient.interceptors.response.handlers[0].rejected(res)
      expect(rejectedRes).rejects.toMatchObject(new Error('Unable to communicate with the server'))
    })

    it('Should return res if promise is resolve', async () => {
      const res = {
        data: {},
      }

      const fulfilled = await xhrClient.apiClient.interceptors.response.handlers[0].fulfilled(res)
      expect(fulfilled).toMatchObject(res)
    })

    it('Should throw error an authentication error if status = 401', async () => {
      const message = 'Incorrect authentication'
      const res = {
        response: { status: 401 },
      }

      const rejectedRes = await xhrClient.apiClient.interceptors.response.handlers[0].rejected(res).catch(error => error)
      expect(rejectedRes).toMatchObject(new Error(message))
    })
  })
})
