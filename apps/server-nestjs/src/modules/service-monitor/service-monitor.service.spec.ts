import { MonitorStatus } from '@cpn-console/shared'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ArgoCDHealthService } from '../argocd/argocd-health.service'
import { GitlabHealthService } from '../gitlab/gitlab-health.service'
import { KeycloakHealthService } from '../keycloak/keycloak-health.service'
import { NexusHealthService } from '../nexus/nexus-health.service'
import { RegistryHealthService } from '../registry/registry-health.service'
import { SonarqubeHealthService } from '../sonarqube/sonarqube-health.service'
import { VaultHealthService } from '../vault/vault-health.service'
import { ServiceMonitorService } from './service-monitor.service'

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
      harbor.check.mockResolvedValue({ harbor: { status: 'up', httpStatus: 200 } })
      nexus.check.mockResolvedValue({ nexus: { status: 'up', httpStatus: 200 } })
      sonarqube.check.mockResolvedValue({ sonarqube: { status: 'up', httpStatus: 200 } })
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

    it('aggregates every injected probe', async () => {
      keycloak.check.mockResolvedValue({ keycloak: { status: 'down', httpStatus: 500 } })

      const health = await service.getServiceHealth()

      expect(health).toEqual([
        { name: 'ArgoCD', status: MonitorStatus.OK, interval: expect.any(Number), lastUpdateTimestamp: expect.any(Number), message: MonitorStatus.OK },
        { name: 'Gitlab', status: MonitorStatus.OK, interval: expect.any(Number), lastUpdateTimestamp: expect.any(Number), message: MonitorStatus.OK },
        { name: 'Harbor', status: MonitorStatus.OK, interval: expect.any(Number), lastUpdateTimestamp: expect.any(Number), message: MonitorStatus.OK },
        { name: 'Keycloak', status: MonitorStatus.ERROR, interval: expect.any(Number), lastUpdateTimestamp: expect.any(Number), message: 'Service en erreur', cause: 'Service en erreur' },
        { name: 'Nexus', status: MonitorStatus.OK, interval: expect.any(Number), lastUpdateTimestamp: expect.any(Number), message: MonitorStatus.OK },
        { name: 'SonarQube', status: MonitorStatus.OK, interval: expect.any(Number), lastUpdateTimestamp: expect.any(Number), message: MonitorStatus.OK },
        { name: 'Vault', status: MonitorStatus.OK, interval: expect.any(Number), lastUpdateTimestamp: expect.any(Number), message: MonitorStatus.OK },
      ])
    })

    it('refreshServiceHealth re-probes every enabled service', async () => {
      await service.refreshServiceHealth()
      await service.refreshServiceHealth()

      expect(keycloak.check).toHaveBeenCalledTimes(2)
      expect(sonarqube.check).toHaveBeenCalledTimes(2)
      expect(sonarqube.check).toHaveBeenCalledWith('sonarqube')
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

    it('skips unregistered probes', async () => {
      keycloak.check.mockResolvedValue({ keycloak: { status: 'up', httpStatus: 200 } })

      const health = await service.getServiceHealth()

      expect(health.map(entry => entry.name)).toEqual(['Keycloak'])
    })

    it('reports a failing probe as En échec with its cause', async () => {
      keycloak.check.mockRejectedValue(new Error('boom'))

      const health = await service.getCompleteServiceHealth()

      expect(health).toEqual([
        { name: 'Keycloak', status: MonitorStatus.ERROR, interval: expect.any(Number), lastUpdateTimestamp: expect.any(Number), message: 'boom', cause: 'boom' },
      ])
    })
  })
})
