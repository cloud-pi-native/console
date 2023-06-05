import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../../api/xhr-client.js'
import { useAdminProjectStore } from './project.js'

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

  it('Should get project list by api call', async () => {
    const data = [
      { id: 'id1', name: 'project1' },
      { id: 'id2', name: 'project2' },
      { id: 'id3', name: 'project3' },
    ]
    apiClient.get.mockReturnValueOnce(Promise.resolve({ data }))
    const adminProjectStore = useAdminProjectStore()

    const res = await adminProjectStore.getAllProjects()

    expect(res).toBe(data)
    expect(apiClient.get).toHaveBeenCalledTimes(1)
    expect(apiClient.get.mock.calls[0][0]).toBe('/admin/projects')
  })
})
