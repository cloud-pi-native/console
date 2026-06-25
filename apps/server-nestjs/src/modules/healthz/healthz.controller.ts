import type { HealthzService } from './healthz.service'
import { Controller, Get } from '@nestjs/common'
import { HealthCheck } from '@nestjs/terminus'

@Controller('api/v1/healthz')
export class HealthzController {
  constructor(private readonly healthz: HealthzService) {}

  @Get()
  @HealthCheck()
  check() {
    return this.healthz.check()
  }
}
