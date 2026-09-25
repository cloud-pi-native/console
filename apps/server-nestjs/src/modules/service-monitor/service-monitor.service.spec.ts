import { MonitorStatus } from '@cpn-console/shared'
import { Test } from '@nestjs/testing'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ArgoCDHealthService } from '../argocd/argocd-health.service'
import { GitlabHealthService } from '../gitlab/gitlab-health.service'
import { KeycloakHealthService } from '../keycloak/keycloak-health.service'
import { NexusHealthService } from '../nexus/nexus-health.service'
import { RegistryHealthService } from '../registry/registry-health.service'
import { SonarqubeHealthService } from '../sonarqube/sonarqube-health.service'
import { VaultHealthService } from '../vault/vault-health.service'
import { ServiceMonitorService } from './service-monitor.service'

const INTERVAL_MS = 5 * 60 * 1000

describe('serviceMonitorService', () => {
  describe('with every optional probe registered', () => {
    let keycloak: ReturnType<typeof mockDeep<KeycloakHealthService>>
    let argocd: ReturnType<typeof mockDeep<ArgoCDHealthService>>
    let gitlab: ReturnType<typeof mockDeep<GitlabHealthService>>
    let harbor: ReturnType<typeof mockDeep<RegistryHealthService>>
    let nexus: ReturnType<typeof mockDeep<NexusHealthService>>
    let sonarqube: ReturnType<typeof mockDeep<SonarqubeHealthService>>
    let vault: ReturnType<typeof mockDeep<VaultHealthService>>
    let service: ServiceMonitorService

    beforeEach(async () => {
      keycloak = mockDeep<KeycloakHealthService>()
      argocd = mockDeep<ArgoCDHealthService>()
      gitlab = mockDeep<GitlabHealthService>()
      harbor = mockDeep<RegistryHealthService>()
      nexus = mockDeep<NexusHealthService>()
      sonarqube = mockDeep<SonarqubeHealthService>()
      vault = mockDeep<VaultHealthService>()
      keycloak.check.mockResolvedValue({ keycloak: { status: 'up', httpStatus: 200 } })
      argocd.check.mockResolvedValue({ argocd: { status: 'up', httpStatus: 200 } })
      gitlab.check.mockResolvedValue({ gitlab: { status: 'up', httpStatus: 200 } })
      harbor.monitor.mockResolvedValue({ status: MonitorStatus.OK, message: MonitorStatus.OK })
      nexus.check.mockResolvedValue({ nexus: { status: 'up', httpStatus: 200 } })
      sonarqube.monitor.mockResolvedValue({ status: MonitorStatus.OK, message: MonitorStatus.OK })
      vault.check.mockResolvedValue({ vault: { status: 'up', httpStatus: 200 } })
      const moduleRef = await Test.createTestingModule({
        providers: [
          ServiceMonitorService,
          { provide: KeycloakHealthService, useValue: keycloak },
          { provide: ArgoCDHealthService, useValue: argocd },
          { provide: GitlabHealthService, useValue: gitlab },
          { provide: RegistryHealthService, useValue: harbor },
          { provide: NexusHealthService, useValue: nexus },
          { provide: SonarqubeHealthService, useValue: sonarqube },
          { provide: VaultHealthService, useValue: vault },
        ],
      }).compile()
      service = moduleRef.get(ServiceMonitorService)
    })

    afterEach(() => service.onModuleDestroy())

    it('aggregates every injected probe', async () => {
      keycloak.check.mockResolvedValue({ keycloak: { status: 'down', httpStatus: 500 } })

      const health = await service.refreshServiceHealth()

      expect(health).toEqual([
        { name: 'ArgoCD', status: MonitorStatus.OK, interval: INTERVAL_MS, lastUpdateTimestamp: expect.any(Number), message: MonitorStatus.OK },
        { name: 'Gitlab', status: MonitorStatus.OK, interval: INTERVAL_MS, lastUpdateTimestamp: expect.any(Number), message: MonitorStatus.OK },
        { name: 'Harbor', status: MonitorStatus.OK, interval: INTERVAL_MS, lastUpdateTimestamp: expect.any(Number), message: MonitorStatus.OK },
        { name: 'Keycloak', status: MonitorStatus.ERROR, interval: INTERVAL_MS, lastUpdateTimestamp: expect.any(Number), message: 'Service en erreur' },
        { name: 'Nexus', status: MonitorStatus.OK, interval: INTERVAL_MS, lastUpdateTimestamp: expect.any(Number), message: MonitorStatus.OK },
        { name: 'SonarQube', status: MonitorStatus.OK, interval: INTERVAL_MS, lastUpdateTimestamp: expect.any(Number), message: MonitorStatus.OK },
        { name: 'Vault', status: MonitorStatus.OK, interval: INTERVAL_MS, lastUpdateTimestamp: expect.any(Number), message: MonitorStatus.OK },
      ])
    })

    it('passes the SonarQube and Harbor monitor verdicts through', async () => {
      sonarqube.monitor.mockResolvedValue({ status: MonitorStatus.WARNING, message: 'Service dégradé' })
      harbor.monitor.mockResolvedValue({ status: MonitorStatus.ERROR, message: 'Service en erreur' })

      const health = await service.refreshServiceHealth()

      expect(health).toContainEqual(expect.objectContaining({ name: 'SonarQube', status: MonitorStatus.WARNING, message: 'Service dégradé' }))
      expect(health).toContainEqual(expect.objectContaining({ name: 'Harbor', status: MonitorStatus.ERROR, message: 'Service en erreur' }))
    })

    it('serves the last known state instead of re-probing on every read', async () => {
      await service.refreshServiceHealth()
      keycloak.check.mockClear()

      service.getServiceHealth()
      service.getServiceHealth()

      expect(keycloak.check).not.toHaveBeenCalled()
    })

    it('exposes the cause on the admin route, never on the public one', async () => {
      keycloak.check.mockResolvedValue({ keycloak: { status: 'down', httpStatus: 503, message: 'connection refused' } })
      await service.refreshServiceHealth()

      expect(service.getCompleteServiceHealth()).toContainEqual(expect.objectContaining({ name: 'Keycloak', cause: 'connection refused' }))
      expect(service.getServiceHealth().every(entry => !('cause' in entry))).toBe(true)
    })

    it('refreshServiceHealth re-probes every enabled service', async () => {
      await service.refreshServiceHealth()
      await service.refreshServiceHealth()

      expect(keycloak.check).toHaveBeenCalledTimes(2)
      expect(sonarqube.monitor).toHaveBeenCalledTimes(2)
      expect(harbor.monitor).toHaveBeenCalledTimes(2)
    })

    it('probes once and schedules the periodic refresh on init', async () => {
      service.onModuleInit()
      await new Promise(resolve => setImmediate(resolve))

      expect(keycloak.check).toHaveBeenCalledTimes(1)
    })
  })

  describe('without optional probes registered', () => {
    let keycloak: ReturnType<typeof mockDeep<KeycloakHealthService>>
    let service: ServiceMonitorService

    beforeEach(async () => {
      keycloak = mockDeep<KeycloakHealthService>()
      const moduleRef = await Test.createTestingModule({
        providers: [
          ServiceMonitorService,
          { provide: KeycloakHealthService, useValue: keycloak },
        ],
      }).compile()
      service = moduleRef.get(ServiceMonitorService)
    })

    afterEach(() => service.onModuleDestroy())

    it('skips unregistered probes', async () => {
      keycloak.check.mockResolvedValue({ keycloak: { status: 'up', httpStatus: 200 } })

      const health = await service.refreshServiceHealth()

      expect(health.map(entry => entry.name)).toEqual(['Keycloak'])
    })

    it('serves the pending state until the first probe', () => {
      expect(service.getServiceHealth()).toEqual([
        { name: 'Keycloak', status: MonitorStatus.UNKNOW, interval: INTERVAL_MS, lastUpdateTimestamp: expect.any(Number), message: 'En attente d\'une première vérification' },
      ])
    })

    it('reports UNKNOW with the request error when the probe rejects', async () => {
      keycloak.check.mockRejectedValue(new Error('boom'))

      const health = await service.refreshServiceHealth()

      expect(health).toEqual([
        { name: 'Keycloak', status: MonitorStatus.UNKNOW, interval: INTERVAL_MS, lastUpdateTimestamp: expect.any(Number), message: 'Erreur lors la requête' },
      ])
      expect(service.getCompleteServiceHealth()).toContainEqual(expect.objectContaining({ name: 'Keycloak', cause: expect.any(Error) }))
    })

    it('reports UNKNOW when the probe payload has no status field', async () => {
      keycloak.check.mockResolvedValue({ keycloak: {} } as never)

      const health = await service.refreshServiceHealth()

      expect(health).toEqual([
        { name: 'Keycloak', status: MonitorStatus.UNKNOW, interval: INTERVAL_MS, lastUpdateTimestamp: expect.any(Number), message: 'Service en erreur' },
      ])
    })

    it('reports ERROR with the probe detail message when status is not up', async () => {
      keycloak.check.mockResolvedValue({ keycloak: { status: 'down', httpStatus: 503, message: 'connection refused' } })

      const health = await service.refreshServiceHealth()

      expect(health).toEqual([
        { name: 'Keycloak', status: MonitorStatus.ERROR, interval: INTERVAL_MS, lastUpdateTimestamp: expect.any(Number), message: 'connection refused' },
      ])
    })
  })
})