import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../../api/xhr-client.js'
import { useAdminZoneStore } from './zone.js'

const apiClientPost = vi.spyOn(apiClient.Zones, 'createZone')
const apiClientPut = vi.spyOn(apiClient.Zones, 'updateZone')
const apiClientDelete = vi.spyOn(apiClient.Zones, 'deleteZone')

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
    apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 201, data: zone }))

    await adminZoneStore.createZone(zone)

    expect(apiClientPost).toHaveBeenCalledTimes(1)
  })

  it('Should update a zone', async () => {
    const adminZoneStore = useAdminZoneStore()

    const zone = { id: 'zoneId', label: 'Zod à update' }
    apiClientPut.mockReturnValueOnce(Promise.resolve({ status: 201, data: zone }))

    await adminZoneStore.updateZone(zone.id, zone)

    expect(apiClientPut).toHaveBeenCalledTimes(1)
  })

  it('Should delete a zone', async () => {
    const adminZoneStore = useAdminZoneStore()

    const zoneId = 'zoneId'
    apiClientDelete.mockReturnValueOnce(Promise.resolve({ status: 204, data: null }))

    await adminZoneStore.deleteZone(zoneId)

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
  })
})
