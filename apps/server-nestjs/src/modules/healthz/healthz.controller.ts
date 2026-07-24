import type { ConfigService } from '@nestjs/config'
import type { ModuleRef } from '@nestjs/core'
import type { HealthCheckService } from '@nestjs/terminus'
import { Controller, Get } from '@nestjs/common'
import { HealthCheck } from '@nestjs/terminus'
import { ArgoCDHealthService } from '../argocd/argocd-health.service'
import { GitlabHealthService } from '../gitlab/gitlab-health.service'
import { DatabaseHealthService } from '../infrastructure/database/database-health.service'
import { KeycloakHealthService } from '../keycloak/keycloak-health.service'
import { NexusHealthService } from '../nexus/nexus-health.service'
import { OpenCdsHealthService } from '../opencds/opencds-health.service'
import { RegistryHealthService } from '../registry/registry-health.service'
import { VaultHealthService } from '../vault/vault-health.service'

interface HealthProbe {
  readonly service: new (...args: any[]) => { check: (name: string) => Promise<unknown> }
  readonly namespace: string
  readonly urlKey: string
}

@Controller('api/v1/healthz')
export class HealthzController {
  private readonly optionalProbes: readonly HealthProbe[] = [
    { service: KeycloakHealthService, namespace: 'keycloak', urlKey: 'KEYCLOAK_DOMAIN' },
    { service: GitlabHealthService, namespace: 'gitlab', urlKey: 'GITLAB_URL' },
    { service: VaultHealthService, namespace: 'vault', urlKey: 'VAULT_URL' },
    { service: NexusHealthService, namespace: 'nexus', urlKey: 'NEXUS_URL' },
    { service: RegistryHealthService, namespace: 'registry', urlKey: 'REGISTRY_URL' },
    { service: ArgoCDHealthService, namespace: 'argocd', urlKey: 'ARGOCD_URL' },
    { service: OpenCdsHealthService, namespace: 'opencds', urlKey: 'OPENCDS_URL' },
  ]

  constructor(
    private readonly health: HealthCheckService,
    private readonly configService: ConfigService,
    private readonly moduleRef: ModuleRef,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const checks: HealthIndicatorFunction[] = []

    // Core infrastructure: always probed when its service is registered.
    const database = this.moduleRef.get(DatabaseHealthService, { strict: false })
    if (database) checks.push(() => database.check('database'))

    // Optional "Service externe": probed only when enabled (service present in the container)
    // AND configured (URL present in its config namespace, which is only loaded when enabled).
    for (const probe of this.optionalProbes) {
      const instance = this.moduleRef.get(probe.service, { strict: false }) as
        | { check: (name: string) => Promise<unknown> }
        | undefined
      if (!instance) continue
      const config = this.configService.get<Record<string, unknown>>(probe.namespace)
      if (config?.[probe.urlKey]) checks.push(() => instance.check(probe.namespace))
    }

    return this.health.check(checks)
  }
}
