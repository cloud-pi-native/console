import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../../api/xhr-client.js'
import { useAdminZoneStore } from './zone.js'

const apiClientPost = vi.spyOn(apiClient, 'post')
const apiClientPut = vi.spyOn(apiClient, 'put')
const apiClientDelete = vi.spyOn(apiClient, 'delete')

describe('Admin zone Store', () => {
  beforeEach(() => {
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('Should create a new zone', async () => {
    const adminZoneStore = useAdminZoneStore()

    const zone = { label: 'Zone à défendre', slug: 'zad' }
    apiClientPost.mockReturnValueOnce(Promise.resolve({ data: zone }))

    await adminZoneStore.createZone()

    expect(apiClientPost).toHaveBeenCalledTimes(1)
    expect(apiClientPost.mock.calls[0][0]).toBe('/admin/zones')
  })

  it('Should update a zone', async () => {
    const adminZoneStore = useAdminZoneStore()

    const zone = { id: 'zoneId', label: 'Zod à update' }
    apiClientPut.mockReturnValueOnce(Promise.resolve({ data: zone }))

    await adminZoneStore.updateZone(zone.id, zone)

    expect(apiClientPut).toHaveBeenCalledTimes(1)
    expect(apiClientPut.mock.calls[0][0]).toBe(`/admin/zones/${zone.id}`)
  })

  it('Should delete a zone', async () => {
    const adminZoneStore = useAdminZoneStore()

    const zoneId = 'zoneId'
    apiClientDelete.mockReturnValueOnce(Promise.resolve({ data: null }))

    await adminZoneStore.deleteZone(zoneId)

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
    expect(apiClientDelete.mock.calls[0][0]).toBe(`/admin/zones/${zoneId}`)
  })
})
