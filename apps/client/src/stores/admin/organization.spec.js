import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../../api/xhr-client.js'
import { useAdminOrganizationStore } from './organization.js'

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
      { id: 'thisIsAnId', label: 'label', name: 'name' },
    ]
    apiClient.get.mockReturnValueOnce(Promise.resolve({ data }))
    const adminOrganizationStore = useAdminOrganizationStore()

    const res = await adminOrganizationStore.getAllOrganizations()

    expect(res).toBe(data)
    expect(apiClient.get).toHaveBeenCalledTimes(1)
    expect(apiClient.get.mock.calls[0][0]).toBe('/admin/organizations')
  })

  it('Should create an organization by api call', async () => {
    const data = { label: 'label', name: 'name' }
    apiClient.post.mockReturnValueOnce(Promise.resolve({ data }))
    const adminOrganizationStore = useAdminOrganizationStore()

    const res = await adminOrganizationStore.createOrganization(data)

    expect(res).toBe(data)
    expect(apiClient.post).toHaveBeenCalledTimes(1)
    expect(apiClient.post.mock.calls[0][0]).toBe('/admin/organizations')
  })

  it('Should update an organization by api call', async () => {
    const data = { name: 'name', active: false }
    apiClient.put.mockReturnValueOnce(Promise.resolve({ data }))
    const adminOrganizationStore = useAdminOrganizationStore()

    const res = await adminOrganizationStore.updateOrganization(data)

    expect(res).toBe(data)
    expect(apiClient.put).toHaveBeenCalledTimes(1)
    expect(apiClient.put.mock.calls[0][0]).toBe('/admin/organizations/name')
  })
})
