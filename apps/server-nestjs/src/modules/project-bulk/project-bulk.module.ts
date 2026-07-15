import { Module } from '@nestjs/common'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { EventsModule } from '../infrastructure/events/events.module'
import { UserPermissionModule } from '../infrastructure/permission/user/user.module'
import { ProjectHooksModule } from '../project-hooks/project-hooks.module'
import { ProjectModule } from '../project/project.module'
import { ProjectBulkController } from './project-bulk.controller'
import { ProjectBulkService } from './project-bulk.service'

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    EventsModule,
    UserPermissionModule,
    ProjectModule,
    ProjectHooksModule,
  ],
  controllers: [ProjectBulkController],
  providers: [ProjectBulkService],
})
export class ProjectBulkModule {}
