import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ExposedAdminToken } from '@cpn-console/shared'
import { apiClient } from '../api/xhr-client'
import { useAdminTokenStore } from './admin-token'

const apiClientGet = vi.spyOn(apiClient.AdminTokens, 'listAdminTokens')
const apiClientPost = vi.spyOn(apiClient.AdminTokens, 'createAdminToken')
const apiClientDelete = vi.spyOn(apiClient.AdminTokens, 'deleteAdminToken')

describe('cluster Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('should get tokens list by api call', async () => {
    const data = []
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const adminTokenStore = useAdminTokenStore()

    await adminTokenStore.listTokens()

    expect(apiClientGet).toHaveBeenCalledTimes(1)
  })

  it('should add token by api call', async () => {
    const data: ExposedAdminToken = {
      name: 'test2',
      expirationDate: null,
      id: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6',
      lastUse: null,
      password: 'password',
      permissions: '2',
    }
    apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 201, body: data }))
    const adminTokenStore = useAdminTokenStore()

    const res = await adminTokenStore.createToken({ name: data.name, permissions: data.permissions })

    expect(res).toBe(data)
    expect(apiClientPost).toHaveBeenCalledTimes(1)
  })

  it('should delete token by api call', async () => {
    const tokenId = '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6'

    apiClientDelete.mockReturnValueOnce(Promise.resolve({ status: 204 }))
    const adminTokenStore = useAdminTokenStore()

    await adminTokenStore.deleteToken(tokenId)

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
  })
})
