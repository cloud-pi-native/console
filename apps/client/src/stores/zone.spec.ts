import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useZoneStore } from './zone.js'

const apiClientGet = vi.spyOn(apiClient, 'get')

describe('Zone Store', () => {
  beforeEach(() => {
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('Should retrieve all zones', async () => {
    const zoneStore = useZoneStore()

    expect(zoneStore.zones).toEqual([])

    const zones = [{ id: 'zoneId' }, { id: 'anotherZoneId' }]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data: zones }))

    await zoneStore.getAllZones()

    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toBe('/zones')
    expect(zoneStore.zones).toMatchObject(zones)
  })
})
