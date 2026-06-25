import { HealthCheckService, TerminusModule } from '@nestjs/terminus'
import { Test } from '@nestjs/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ArgoCDHealthService } from '../argocd/argocd-health.service'
import { GitlabHealthService } from '../gitlab/gitlab-health.service'
import { DatabaseHealthService } from '../infrastructure/database/database-health.service'
import { KeycloakHealthService } from '../keycloak/keycloak-health.service'
import { NexusHealthService } from '../nexus/nexus-health.service'
import { RegistryHealthService } from '../registry/registry-health.service'
import { ServiceChainHealthService } from '../service-chain/service-chain-health.service'
import { VaultHealthService } from '../vault/vault-health.service'
import { HealthzService } from './healthz.service'

describe('healthzService', () => {
  afterEach(() => vi.clearAllMocks())

  describe('with all optional probes registered', () => {
    let healthCheck: ReturnType<typeof mockDeep<HealthCheckService>>
    let database: ReturnType<typeof mockDeep<DatabaseHealthService>>
    let keycloak: ReturnType<typeof mockDeep<KeycloakHealthService>>
    let gitlab: ReturnType<typeof mockDeep<GitlabHealthService>>
    let vault: ReturnType<typeof mockDeep<VaultHealthService>>
    let nexus: ReturnType<typeof mockDeep<NexusHealthService>>
    let registry: ReturnType<typeof mockDeep<RegistryHealthService>>
    let argocd: ReturnType<typeof mockDeep<ArgoCDHealthService>>
    let healthService: ReturnType<typeof mockDeep<ServiceChainHealthService>>
    let service: HealthzService

    beforeEach(async () => {
      healthCheck = mockDeep<HealthCheckService>()
      healthCheck.check.mockImplementation(async (checks) => {
        await Promise.all(checks.map(c => c()))
        return { status: 'ok', details: {} }
      })
      database = mockDeep<DatabaseHealthService>()
      keycloak = mockDeep<KeycloakHealthService>()
      gitlab = mockDeep<GitlabHealthService>()
      vault = mockDeep<VaultHealthService>()
      nexus = mockDeep<NexusHealthService>()
      registry = mockDeep<RegistryHealthService>()
      argocd = mockDeep<ArgoCDHealthService>()
      healthService = mockDeep<ServiceChainHealthService>()
      const moduleRef = await Test.createTestingModule({
        imports: [TerminusModule.forRoot()],
        providers: [
          HealthzService,
          { provide: HealthCheckService, useValue: healthCheck },
          { provide: DatabaseHealthService, useValue: database },
          { provide: KeycloakHealthService, useValue: keycloak },
          { provide: GitlabHealthService, useValue: gitlab },
          { provide: VaultHealthService, useValue: vault },
          { provide: NexusHealthService, useValue: nexus },
          { provide: RegistryHealthService, useValue: registry },
          { provide: ArgoCDHealthService, useValue: argocd },
          { provide: ServiceChainHealthService, useValue: healthService },
        ],
      }).compile()
      service = moduleRef.get(HealthzService)
    })

    it('checks every injected probe', async () => {
      await service.check()

      expect(database.check).toHaveBeenCalled()
      expect(keycloak.check).toHaveBeenCalled()
      expect(gitlab.check).toHaveBeenCalled()
      expect(vault.check).toHaveBeenCalled()
      expect(nexus.check).toHaveBeenCalled()
      expect(registry.check).toHaveBeenCalled()
      expect(argocd.check).toHaveBeenCalled()
      expect(healthService.check).toHaveBeenCalled()
    })
  })

  describe('without optional probes registered', () => {
    let healthCheck: ReturnType<typeof mockDeep<HealthCheckService>>
    let database: ReturnType<typeof mockDeep<DatabaseHealthService>>
    let keycloak: ReturnType<typeof mockDeep<KeycloakHealthService>>
    let service: HealthzService

    beforeEach(async () => {
      healthCheck = mockDeep<HealthCheckService>()
      healthCheck.check.mockImplementation(async (checks) => {
        await Promise.all(checks.map(c => c()))
        return { status: 'ok', details: {} }
      })
      database = mockDeep<DatabaseHealthService>()
      keycloak = mockDeep<KeycloakHealthService>()
      const moduleRef = await Test.createTestingModule({
        imports: [TerminusModule.forRoot()],
        providers: [
          HealthzService,
          { provide: HealthCheckService, useValue: healthCheck },
          { provide: DatabaseHealthService, useValue: database },
          { provide: KeycloakHealthService, useValue: keycloak },
        ],
      }).compile()
      service = moduleRef.get(HealthzService)
    })

    it('omits probes whose services are not registered', async () => {
      await service.check()

      expect(database.check).toHaveBeenCalled()
      expect(keycloak.check).toHaveBeenCalled()
      expect(healthCheck.check).toHaveBeenCalledWith([expect.any(Function), expect.any(Function)])
    })
  })
})
