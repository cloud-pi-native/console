import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useOrganizationStore } from './organization.js'

const apiClientGet = vi.spyOn(apiClient.Organizations, 'getOrganizations')

describe('Organization Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should get organization list by api call', async () => {
    const data = [{ id: 'thisIsAnId', label: 'label', name: 'name' }]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const ciFilesStore = useOrganizationStore()

    expect(ciFilesStore.organizations).toEqual(undefined)

    await ciFilesStore.setOrganizations()

    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(ciFilesStore.organizations).toEqual(data)
  })
})
