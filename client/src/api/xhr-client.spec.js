import { vi } from 'vitest'
import * as xhrClient from './xhr-client.js'

vi.spyOn(Object.getPrototypeOf(window.localStorage), 'getItem')
Object.getPrototypeOf(window.localStorage).getItem = vi.fn(() => 'token')

describe('xhr-client', () => {
  describe('Request interceptor', () => {
    it('Should return config if url = "/auth"', async () => {
      const config = {
        url: '/auth',
      }

      const fullfiled = xhrClient.apiClient.interceptors.request.handlers[0].fulfilled(config)
      expect(fullfiled).toMatchObject(config)
    })

    it('Should return config if url = "/version"', async () => {
      const config = {
        url: '/version',
      }

      const fullfiled = xhrClient.apiClient.interceptors.request.handlers[0].fulfilled(config)
      expect(fullfiled).toMatchObject(config)
    })

    it('Should add token to the request', async () => {
      const config = {
        url: '/items',
        headers: {},
      }

      const fullfiled = xhrClient.apiClient.interceptors.request.handlers[0].fulfilled(config)
      expect(localStorage.getItem).toHaveBeenCalled()
      expect(fullfiled.headers).toHaveProperty('Authorization', 'Bearer token')
    })
  })

  describe('Response interceptor', () => {
    it('Should throw error with specific message if response status >= 400', async () => {
      const message = 'Error while responding'
      const res = {
        response: { status: 500, data: { message } },
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

    it('Should throw error with ECONNABORTED if response status >= 400', async () => {
      const message = 'Error while responding'
      const res = {
        response: { status: 400, data: { message } },
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
