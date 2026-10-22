import type { ServiceBody } from '@cpn-console/shared'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api/xhr-client.js'
import { HEALTH_POLL_INTERVAL_MS, useServiceStore } from './services-monitor.js'

const apiClientGet = vi.spyOn(apiClient.Services, 'getServiceHealth')

describe('service Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('should get services health by api call (healthy)', async () => {
    const data: ServiceBody = [
      { interval: 300000, lastUpdateTimestamp: Date.now(), message: 'OK', name: 'Keycloak', status: 'OK' },
      { interval: 300000, lastUpdateTimestamp: Date.now(), message: 'Service perdu', name: 'Gitlab', status: 'OK' },
    ]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const serviceStore = useServiceStore()

    expect(serviceStore.servicesHealth).toMatchObject({})
    expect(serviceStore.services).toMatchObject([])

    await serviceStore.checkServicesHealth()

    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(serviceStore.servicesHealth).toMatchObject({
      message: 'Tous les services fonctionnent normalement',
      serviceStatus: 'OK',
      status: 'success',
    })
    expect(serviceStore.services).toMatchObject(data)
  })

  it('should get services health by api call (unhealthy)', async () => {
    const data = [
      { interval: 300000, lastUpdateTimestamp: Date.now(), message: 'OK', name: 'Keycloak', status: 'OK' },
      { interval: 300000, lastUpdateTimestamp: Date.now(), message: 'Service perdu', name: 'Gitlab', status: 'Inconnu' },
    ]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const serviceStore = useServiceStore()

    expect(serviceStore.servicesHealth).toMatchObject({})
    expect(serviceStore.services).toMatchObject([])

    await serviceStore.checkServicesHealth()

    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(serviceStore.servicesHealth).toMatchObject({
      message: 'Échec lors de la dernière vérification',
      serviceStatus: 'Inconnu',
      status: undefined,
    })
    expect(serviceStore.services).toMatchObject(data)
  })

  describe('health polling', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('checks immediately, then on every interval until it is stopped', async () => {
      const data: ServiceBody = [
        { interval: HEALTH_POLL_INTERVAL_MS, lastUpdateTimestamp: Date.now(), message: 'OK', name: 'Keycloak', status: 'OK' },
      ]
      apiClientGet.mockResolvedValue({ status: 200, body: data })

      const serviceStore = useServiceStore()
      await serviceStore.startHealthPolling()

      expect(apiClientGet).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(HEALTH_POLL_INTERVAL_MS)
      expect(apiClientGet).toHaveBeenCalledTimes(2)

      serviceStore.stopHealthPolling()
      await vi.advanceTimersByTimeAsync(HEALTH_POLL_INTERVAL_MS * 2)
      expect(apiClientGet).toHaveBeenCalledTimes(2)
    })
  })
})
