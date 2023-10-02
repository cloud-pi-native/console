import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useServiceStore } from './services.js'

const apiClientGet = vi.spyOn(apiClient, 'get')

describe('Counter Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should get services health by api call (healthy)', async () => {
    const data = [{ id: 'serviceId', code: 200 }, { id: 'anotherServiceId', code: 200 }]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data }))
    const serviceStore = useServiceStore()

    expect(serviceStore.servicesHealth).toMatchObject({})
    expect(serviceStore.services).toMatchObject([])

    await serviceStore.checkServicesHealth()

    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toBe('/services')
    expect(serviceStore.servicesHealth).toMatchObject({
      message: 'Tous les services fonctionnent',
      status: 'success',
    })
    expect(serviceStore.services).toMatchObject(data)
  })

  it('Should get services health by api call (unhealthy)', async () => {
    const data = [{ id: 'serviceId', code: 404 }, { id: 'anotherServiceId', code: 200 }]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data }))
    const serviceStore = useServiceStore()

    expect(serviceStore.servicesHealth).toMatchObject({})
    expect(serviceStore.services).toMatchObject([])

    await serviceStore.checkServicesHealth()

    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toBe('/services')
    expect(serviceStore.servicesHealth).toMatchObject({
      message: 'Un ou plusieurs services dysfonctionnent',
      status: 'error',
    })
    expect(serviceStore.services).toMatchObject(data)
  })
})