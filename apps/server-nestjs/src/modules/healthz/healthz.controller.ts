import { Controller, Get, Inject } from '@nestjs/common'
import { HealthCheck, HealthCheckService } from '@nestjs/terminus'
import { DatabaseHealthService } from '../../cpin-module/infrastructure/database/database-health.service'
import { KeycloakHealthService } from '../keycloak/keycloak-health.service'

@Controller('api/v1/healthz')
export class HealthzController {
  constructor(
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
    @Inject(DatabaseHealthService) private readonly database: DatabaseHealthService,
    @Inject(KeycloakHealthService) private readonly keycloak: KeycloakHealthService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.database.check('database'),
      () => this.keycloak.check('keycloak'),
    ])
  }
}
