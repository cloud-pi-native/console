import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useOrganizationStore } from './organization.js'

const apiClientGet = vi.spyOn(apiClient.Organizations, 'listOrganizations')

describe('organization Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('should get organization list by api call', async () => {
    const data = [{ id: 'thisIsAnId', label: 'label', name: 'name' }]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const organizationStore = useOrganizationStore()

    await organizationStore.listOrganizations()

    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(organizationStore.organizations).toEqual(data)
  })
})

const apiClientPost = vi.spyOn(apiClient.Organizations, 'createOrganization')
const apiClientPut = vi.spyOn(apiClient.Organizations, 'updateOrganization')
const apiClientSync = vi.spyOn(apiClient.Organizations, 'syncOrganizations')

describe('organization Admin Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('should get organization list by api call', async () => {
    const data = [
      { id: 'thisIsAnId', label: 'label', name: 'name' },
    ]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const organizationStore = useOrganizationStore()

    const res = await organizationStore.listOrganizations()

    expect(res).toStrictEqual(data)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
  })

  it('should create an organization by api call', async () => {
    const data = { label: 'label', name: 'name', source: 'external' }
    apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 201, body: data }))
    const organizationStore = useOrganizationStore()

    const res = await organizationStore.createOrganization(data)

    expect(res).toBe(data)
    expect(apiClientPost).toHaveBeenCalledTimes(1)
  })

  it('should update an organization by api call', async () => {
    const data = { label: 'label', name: 'name', active: false, source: 'external' }
    apiClientPut.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const organizationStore = useOrganizationStore()

    const res = await organizationStore.updateOrganization(data)

    expect(res).toBe(data)
    expect(apiClientPut).toHaveBeenCalledTimes(1)
  })

  it('should synchronize organizations by api call', async () => {
    const data = [
      { name: 'name1', label: 'label', source: 'source1', active: false },
      { name: 'name2', label: 'label', source: 'source1', active: false },
      { name: 'name3', label: 'label', source: 'source2', active: false },
    ]
    apiClientSync.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const organizationStore = useOrganizationStore()

    const res = await organizationStore.syncOrganizations()

    expect(res).toBe(data)
    expect(apiClientSync).toHaveBeenCalledTimes(1)
  })
})
