import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import { opencdsConfigFactory } from '../../config/opencds.config'
import { OpenCdsHealthService } from './opencds-health.service'

@Module({
  imports: [TerminusModule, ConfigModule.forFeature(opencdsConfigFactory)],
  providers: [OpenCdsHealthService],
  exports: [OpenCdsHealthService],
})
export class OpenCdsModule {}
