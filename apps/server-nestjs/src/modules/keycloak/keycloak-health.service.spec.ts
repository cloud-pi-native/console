import { HealthIndicatorService, TerminusModule } from '@nestjs/terminus'
import { Test } from '@nestjs/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { keycloakConfigFactory } from '../../config/keycloak.config'
import { KeycloakHealthService } from './keycloak-health.service'

describe('keycloakHealthService', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('reports not configured when KEYCLOAK_DOMAIN/REALM are empty (no fetch)', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TerminusModule.forRoot()],
      providers: [
        KeycloakHealthService,
        { provide: keycloakConfigFactory.KEY, useValue: keycloakConfigFactory() },
      ],
    }).compile()
    const service = moduleRef.get(KeycloakHealthService)

    const indicator = moduleRef.get(HealthIndicatorService) as unknown as {
      check: (k: string) => { down: (r: string) => unknown }
    }
    let downReason: string | undefined
    vi.spyOn(indicator, 'check').mockImplementation((_k: string) => ({
      down: (reason: string) => {
        downReason = reason
        return { status: 'down' }
      },
    }))

    await service.check('keycloak')

    expect(downReason).toContain('not configured')
  })
})
