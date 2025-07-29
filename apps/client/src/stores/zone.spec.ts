import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { apiClient } from '../api/xhr-client'
import { useZoneStore } from './zone'

const apiClientGet = vi.spyOn(apiClient.Zones, 'listZones')
const apiClientPost = vi.spyOn(apiClient.Zones, 'createZone')
const apiClientPut = vi.spyOn(apiClient.Zones, 'updateZone')
const apiClientDelete = vi.spyOn(apiClient.Zones, 'deleteZone')

describe('zone Store', () => {
  beforeEach(() => {
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should retrieve all zones', async () => {
    const zoneStore = useZoneStore()

    expect(zoneStore.zones).toEqual([])

    const zones = [{ id: 'zoneId' }, { id: 'anotherZoneId' }]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: zones }))

    await zoneStore.getAllZones()

    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(zoneStore.zones).toMatchObject(zones)
  })

  it('should create a new zone', async () => {
    const adminZoneStore = useZoneStore()

    const zone = { label: 'Zone à défendre', slug: 'zad' }
    apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 201, data: zone }))

    await adminZoneStore.createZone(zone)

    expect(apiClientPost).toHaveBeenCalledTimes(1)
  })

  it('should update a zone', async () => {
    const adminZoneStore = useZoneStore()

    const zone = { id: 'zoneId', label: 'Zod à update' }
    apiClientPut.mockReturnValueOnce(Promise.resolve({ status: 200, data: zone }))

    await adminZoneStore.updateZone(zone.id, zone)

    expect(apiClientPut).toHaveBeenCalledTimes(1)
  })

  it('should delete a zone', async () => {
    const adminZoneStore = useZoneStore()

    const zoneId = 'zoneId'
    apiClientDelete.mockReturnValueOnce(Promise.resolve({ status: 204, data: null }))

    await adminZoneStore.deleteZone(zoneId)

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
  })
})
