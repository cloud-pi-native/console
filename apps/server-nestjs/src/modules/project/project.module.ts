import { Module } from '@nestjs/common'
import { AppEventsModule } from '../events/app-events.module'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { EventsModule } from '../infrastructure/events/events.module'
import { ProjectPermissionModule } from '../infrastructure/permission/project/project.module'
import { UserPermissionModule } from '../infrastructure/permission/user/user.module'
import { LogModule } from '../log/log.module'
import { ProjectController } from './project.controller'
import { ProjectService } from './project.service'

@Module({
  imports: [
    AppEventsModule,
    AuthModule,
    DatabaseModule,
    EventsModule,
    ProjectPermissionModule,
    UserPermissionModule,
    LogModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
