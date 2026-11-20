import { Module } from '@nestjs/common'
import { AuthModule } from '../../infrastructure/auth/auth.module'
import { DatabaseModule } from '../../infrastructure/database/database.module'
import { ProjectPermissionModule } from '../../infrastructure/permission/project/project.module'
import { KeycloakModule } from '../../integrations/keycloak/keycloak.module'
import { AppEventsModule } from '../events/app-events.module'
import { ProjectMembersController } from './project-members.controller'
import { ProjectMembersService } from './project-members.service'

@Module({
  imports: [AppEventsModule, AuthModule, DatabaseModule, KeycloakModule, ProjectPermissionModule],
  controllers: [ProjectMembersController],
  providers: [ProjectMembersService],
})
export class ProjectMembersModule {}
