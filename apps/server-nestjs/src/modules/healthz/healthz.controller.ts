import { Controller, Get, Inject } from '@nestjs/common'
import { HealthCheck } from '@nestjs/terminus'
import { HealthzService } from './healthz.service'

@Controller('api/v1/healthz')
export class HealthzController {
  constructor(@Inject(HealthzService) private readonly healthz: HealthzService) {}

  @Get()
  @HealthCheck()
  check() {
    return this.healthz.check()
  }
}
