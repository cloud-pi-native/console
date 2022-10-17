import { vi } from 'vitest'
import { apiClient } from './xhr-client.js'
import {
  requestToken,
  verifyToken,
} from './api.js'

vi.spyOn(apiClient, 'get')
vi.spyOn(apiClient, 'post')
vi.spyOn(apiClient, 'put')
vi.spyOn(apiClient, 'patch')
vi.spyOn(apiClient, 'delete')

describe('Connection', () => {
  it('Should request token (POST)', async () => {
    apiClient.post.mockReturnValueOnce(Promise.resolve({ data: { success: true } }))

    await requestToken({})

    expect(apiClient.post).toHaveBeenCalled()
    expect(apiClient.post).toHaveBeenCalledTimes(1)
    expect(apiClient.post.mock.calls[0][0]).toBe('/auth')
  })

  it('Should verify token (GET)', async () => {
    apiClient.get.mockReturnValueOnce(Promise.resolve({ data: { success: true } }))

    await verifyToken({})

    expect(apiClient.get).toHaveBeenCalled()
    expect(apiClient.get).toHaveBeenCalledTimes(1)
    expect(apiClient.get.mock.calls[0][0]).toBe('/auth/verify-token')
  })
})
