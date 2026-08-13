import type { ArgoCDHealthService } from '../argocd/argocd-health.service'
import type { KeycloakHealthService } from '../keycloak/keycloak-health.service'
import type { SonarqubeHealthService } from '../sonarqube/sonarqube-health.service'
import { describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ServiceMonitorService } from './service-monitor.service'

describe('serviceMonitorService', () => {
  it('aggregates every injected probe', async () => {
    const argocd = mockDeep<ArgoCDHealthService>()
    argocd.check.mockResolvedValue({ argocd: { status: 'up', httpStatus: 200 } })
    const keycloak = mockDeep<KeycloakHealthService>()
    keycloak.check.mockResolvedValue({ keycloak: { status: 'down', httpStatus: 500 } })
    const service = new ServiceMonitorService(keycloak, argocd, undefined, undefined, undefined, undefined, undefined)

    const health = await service.getServiceHealth()

    expect(health).toEqual([
      { name: 'argocd', status: 'OK', interval: expect.any(Number), lastUpdateTimestamp: expect.any(Number), message: 'OK' },
      { name: 'keycloak', status: 'En échec', interval: expect.any(Number), lastUpdateTimestamp: expect.any(Number), message: 'Service en erreur' },
    ])
  })

  it('skips disabled probes', async () => {
    const keycloak = mockDeep<KeycloakHealthService>()
    keycloak.check.mockResolvedValue({ keycloak: { status: 'up', httpStatus: 200 } })
    const service = new ServiceMonitorService(keycloak, undefined, undefined, undefined, undefined, undefined, undefined)

    const health = await service.getServiceHealth()

    expect(health.map(entry => entry.name)).toEqual(['keycloak'])
  })

  it('reports a failing probe as En échec with its cause', async () => {
    const keycloak = mockDeep<KeycloakHealthService>()
    keycloak.check.mockRejectedValue(new Error('boom'))
    const service = new ServiceMonitorService(keycloak, undefined, undefined, undefined, undefined, undefined, undefined)

    const health = await service.getCompleteServiceHealth()

    expect(health).toEqual([
      { name: 'keycloak', status: 'En échec', interval: expect.any(Number), lastUpdateTimestamp: expect.any(Number), message: 'boom', cause: 'boom' },
    ])
  })

  it('refreshServiceHealth re-probes every enabled service', async () => {
    const keycloak = mockDeep<KeycloakHealthService>()
    keycloak.check.mockResolvedValue({ keycloak: { status: 'up', httpStatus: 200 } })
    const sonarqube = mockDeep<SonarqubeHealthService>()
    sonarqube.check.mockResolvedValue({ sonarqube: { status: 'up', httpStatus: 200 } })
    const service = new ServiceMonitorService(keycloak, undefined, undefined, undefined, undefined, sonarqube, undefined)
    await service.refreshServiceHealth()
    await service.refreshServiceHealth()

    expect(keycloak.check).toHaveBeenCalledTimes(2)
    expect(sonarqube.check).toHaveBeenCalledTimes(2)
    expect(sonarqube.check).toHaveBeenCalledWith('sonarqube')
  })
})
