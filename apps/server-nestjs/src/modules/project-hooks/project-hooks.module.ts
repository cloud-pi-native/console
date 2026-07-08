import { Module } from '@nestjs/common'
import { AppEventsModule } from '../events/app-events.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { ProjectHooksController } from './project-hooks.controller'
import { ProjectHooksService } from './project-hooks.service'

@Module({
  imports: [AppEventsModule, InfrastructureModule],
  controllers: [ProjectHooksController],
  providers: [ProjectHooksService],
  exports: [ProjectHooksService],
})
export class ProjectHooksModule {}
