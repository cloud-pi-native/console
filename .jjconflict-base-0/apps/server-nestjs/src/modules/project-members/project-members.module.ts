import { Module } from '@nestjs/common'
import { keycloakConfigFactory } from '../../config/keycloak.config'
import { AppEventsModule } from '../events/app-events.module'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { ProjectPermissionModule } from '../infrastructure/permission/project/project.module'
import { KeycloakModule } from '../keycloak/keycloak.module'
import { ProjectMembersController } from './project-members.controller'
import { ProjectMembersService } from './project-members.service'

@Module({
  imports: [AppEventsModule, AuthModule, DatabaseModule, KeycloakModule.forRoot(keycloakConfigFactory.asProvider()), ProjectPermissionModule],
  controllers: [ProjectMembersController],
  providers: [ProjectMembersService],
})
export class ProjectMembersModule {}
