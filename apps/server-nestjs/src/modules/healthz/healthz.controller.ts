import { Controller, Get, Inject } from '@nestjs/common'
import { HealthCheck, HealthCheckService } from '@nestjs/terminus'
import { Public } from 'nest-keycloak-connect'
import { DatabaseHealthService } from '../../cpin-module/infrastructure/database/database-health.service'

@Controller('api/v1/healthz')
@Public()
export class HealthzController {
  constructor(
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
    @Inject(DatabaseHealthService) private readonly database: DatabaseHealthService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.database.check('database'),
    ])
  }
}
