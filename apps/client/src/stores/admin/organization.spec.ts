import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../../api/xhr-client.js'
import { useAdminOrganizationStore } from './organization.js'

const apiClientGet = vi.spyOn(apiClient.OrganizationsAdmin, 'getAllOrganizations')
const apiClientPost = vi.spyOn(apiClient.OrganizationsAdmin, 'createOrganization')
const apiClientPut = vi.spyOn(apiClient.OrganizationsAdmin, 'updateOrganization')
const apiClientSync = vi.spyOn(apiClient.OrganizationsAdmin, 'syncOrganizations')

describe('Organization Admin Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should get organization list by api call', async () => {
    const data = [
      { id: 'thisIsAnId', label: 'label', name: 'name' },
    ]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const adminOrganizationStore = useAdminOrganizationStore()

    const res = await adminOrganizationStore.getAllOrganizations()

    expect(res).toBe(data)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
  })

  it('Should create an organization by api call', async () => {
    const data = { label: 'label', name: 'name', source: 'external' }
    apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 201, body: data }))
    const adminOrganizationStore = useAdminOrganizationStore()

    const res = await adminOrganizationStore.createOrganization(data)

    expect(res).toBe(data)
    expect(apiClientPost).toHaveBeenCalledTimes(1)
  })

  it('Should update an organization by api call', async () => {
    const data = { label: 'label', name: 'name', active: false, source: 'external' }
    apiClientPut.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const adminOrganizationStore = useAdminOrganizationStore()

    const res = await adminOrganizationStore.updateOrganization(data)

    expect(res).toBe(data)
    expect(apiClientPut).toHaveBeenCalledTimes(1)
  })

  it('Should synchronize organizations by api call', async () => {
    const data = [
      { name: 'name1', label: 'label', source: 'source1', active: false },
      { name: 'name2', label: 'label', source: 'source1', active: false },
      { name: 'name3', label: 'label', source: 'source2', active: false },
    ]
    apiClientSync.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const adminOrganizationStore = useAdminOrganizationStore()

    const res = await adminOrganizationStore.fetchOrganizations()

    expect(res).toBe(data)
    expect(apiClientSync).toHaveBeenCalledTimes(1)
  })
})
