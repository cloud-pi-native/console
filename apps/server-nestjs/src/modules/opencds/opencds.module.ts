import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { OpenCdsHealthService } from './opencds-health.service'
import { ConfigurableModuleClass } from './opencds.module-definition'

@Module({
  imports: [TerminusModule],
  providers: [OpenCdsHealthService],
  exports: [OpenCdsHealthService],
})
export class OpenCdsModule extends ConfigurableModuleClass {}
