import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { LogModule } from '../log/log.module'
import { ProjectHooksController } from './project-hooks.controller'
import { ProjectHooksService } from './project-hooks.service'

@Module({
  imports: [InfrastructureModule, LogModule],
  controllers: [ProjectHooksController],
  providers: [ProjectHooksService],
  exports: [ProjectHooksService],
})
export class ProjectHooksModule {}
