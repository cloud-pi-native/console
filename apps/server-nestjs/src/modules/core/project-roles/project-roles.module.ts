import { Module } from '@nestjs/common'
import { AuthModule } from '../../infrastructure/auth/auth.module'
import { DatabaseModule } from '../../infrastructure/database/database.module'
import { ProjectPermissionModule } from '../../infrastructure/permission/project/project.module'
import { AppEventsModule } from '../events/app-events.module'
import { ProjectRolesController } from './project-roles.controller'
import { ProjectRolesService } from './project-roles.service'

@Module({
  imports: [AppEventsModule, AuthModule, DatabaseModule, ProjectPermissionModule],
  controllers: [ProjectRolesController],
  providers: [ProjectRolesService],
  exports: [ProjectRolesService],
})
export class ProjectRolesModule {}
