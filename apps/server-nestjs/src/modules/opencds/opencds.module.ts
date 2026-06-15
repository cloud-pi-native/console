import { Module } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
import { OpenCdsHealthService } from './opencds-health.service'

@Module({
  imports: [ConfigurationModule],
  providers: [HealthIndicatorService, OpenCdsHealthService],
  exports: [OpenCdsHealthService],
})
export class OpenCdsModule {}
