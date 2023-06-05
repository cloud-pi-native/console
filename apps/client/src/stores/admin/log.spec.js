import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../../api/xhr-client.js'
import { useAdminLogStore } from './log.js'

vi.spyOn(apiClient, 'get')
vi.spyOn(apiClient, 'post')
vi.spyOn(apiClient, 'put')
vi.spyOn(apiClient, 'patch')
vi.spyOn(apiClient, 'delete')

describe('Counter Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should get organization list by api call', async () => {
    const data = [
      { id: 'thisIsAnId', data: {}, action: 'Create Project', userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565' },
    ]
    apiClient.get.mockReturnValueOnce(Promise.resolve({ data }))
    const adminLogStore = useAdminLogStore()

    const res = await adminLogStore.getAllLogs({ offset: 5, limit: 10 })

    expect(res).toBe(data)
    expect(apiClient.get).toHaveBeenCalledTimes(1)
    expect(apiClient.get.mock.calls[0][0]).toBe('/admin/logs/5/10')
  })

  it('Should count logs by api call', async () => {
    const data = 12
    apiClient.get.mockReturnValueOnce(Promise.resolve({ data }))
    const adminLogStore = useAdminLogStore()

    const res = await adminLogStore.countAllLogs()

    expect(res).toBe(data)
    expect(apiClient.get).toHaveBeenCalledTimes(1)
    expect(apiClient.get.mock.calls[0][0]).toBe('/admin/logs/count')
  })
})
