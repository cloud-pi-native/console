import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useOrganizationStore } from './organization.js'

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
    const data = [{ id: 'thisIsAnId', label: 'label', name: 'name' }]
    apiClient.get.mockReturnValueOnce(Promise.resolve({ data }))
    const ciFilesStore = useOrganizationStore()

    expect(ciFilesStore.organizations).toEqual([])

    await ciFilesStore.setOrganizations({})

    expect(apiClient.get).toHaveBeenCalledTimes(1)
    expect(apiClient.get.mock.calls[0][0]).toBe('/organizations')
    expect(ciFilesStore.organizations).toEqual(data)
  })
})
