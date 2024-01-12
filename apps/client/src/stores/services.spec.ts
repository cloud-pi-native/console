import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useServiceStore } from './services.js'
import type { MonitorServiceModel } from '@dso-console/shared'

const apiClientGet = vi.spyOn(apiClient, 'get')

describe('Counter Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should get services health by api call (healthy)', async () => {
    const data: MonitorServiceModel = [
      { interval: 300000, lastUpdateTimestamp: (new Date()).getTime(), message: 'OK', name: 'Keycloak', status: 'OK' },
      { interval: 300000, lastUpdateTimestamp: (new Date()).getTime(), message: 'Service perdu', name: 'Gitlab', status: 'OK' }]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data }))
    const serviceStore = useServiceStore()

    expect(serviceStore.servicesHealth).toMatchObject({})
    expect(serviceStore.services).toMatchObject([])

    await serviceStore.checkServicesHealth()

    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toBe('/services')
    expect(serviceStore.servicesHealth).toMatchObject({
      message: 'Tous les services fonctionnent normalement',
      serviceStatus: 'OK',
      status: 'success',
    })
    expect(serviceStore.services).toMatchObject(data)
  })

  it('Should get services health by api call (unhealthy)', async () => {
    const data = [
      { interval: 300000, lastUpdateTimestamp: (new Date()).getTime(), message: 'OK', name: 'Keycloak', status: 'OK' },
      { interval: 300000, lastUpdateTimestamp: (new Date()).getTime(), message: 'Service perdu', name: 'Gitlab', status: 'Inconnu' }]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data }))
    const serviceStore = useServiceStore()

    expect(serviceStore.servicesHealth).toMatchObject({})
    expect(serviceStore.services).toMatchObject([])

    await serviceStore.checkServicesHealth()

    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toBe('/services')
    expect(serviceStore.servicesHealth).toMatchObject({
      message: 'Échec lors de la dernière vérification',
      serviceStatus: 'Inconnu',
      status: '',
    })
    expect(serviceStore.services).toMatchObject(data)
  })
})
