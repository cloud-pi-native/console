import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import openCdsConfigFactory from '../../config/opencds'
import { OpenCdsHealthService } from './opencds-health.service'

@Module({
  imports: [TerminusModule, ConfigModule.forFeature([openCdsConfigFactory])],
  providers: [OpenCdsHealthService],
  exports: [OpenCdsHealthService],
})
export class OpenCdsModule {}
