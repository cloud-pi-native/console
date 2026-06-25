import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../../infrastructure/infrastructure.module'
import { LogModule } from '../log/log.module.js'
import { ProjectHooksController } from './project-hooks.controller.js'
import { ProjectHooksService } from './project-hooks.service.js'

@Module({
  imports: [InfrastructureModule, LogModule],
  controllers: [ProjectHooksController],
  providers: [ProjectHooksService],
  exports: [ProjectHooksService],
})
export class ProjectHooksModule {}
