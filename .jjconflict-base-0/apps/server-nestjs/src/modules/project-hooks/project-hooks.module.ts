import { Module } from '@nestjs/common'
import { AppEventsModule } from '../events/app-events.module'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { EventsModule } from '../infrastructure/events/events.module'
import { ProjectPermissionModule } from '../infrastructure/permission/project/project.module'
import { LogModule } from '../log/log.module'
import { ProjectHooksController } from './project-hooks.controller'
import { ProjectHooksService } from './project-hooks.service'

@Module({
  imports: [AppEventsModule, AuthModule, DatabaseModule, EventsModule, LogModule, ProjectPermissionModule],
  controllers: [ProjectHooksController],
  providers: [ProjectHooksService],
  exports: [ProjectHooksService],
})
export class ProjectHooksModule {}
