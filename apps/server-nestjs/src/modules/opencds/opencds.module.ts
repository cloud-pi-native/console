import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
import { OpenCdsHealthService } from './opencds-health.service'

@Module({
  imports: [ConfigurationModule, TerminusModule],
  providers: [OpenCdsHealthService],
  exports: [OpenCdsHealthService],
})
export class OpenCdsModule {}
