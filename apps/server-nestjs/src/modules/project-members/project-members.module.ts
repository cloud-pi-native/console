import { Module } from '@nestjs/common'
import { AppEventsModule } from '../events/app-events.module'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { KeycloakModule } from '../keycloak/keycloak.module'
import { ProjectMembersController } from './project-members.controller'
import { ProjectMembersService } from './project-members.service'

@Module({
  imports: [AppEventsModule, InfrastructureModule, AuthModule, KeycloakModule],
  controllers: [ProjectMembersController],
  providers: [ProjectMembersService],
})
export class ProjectMembersModule {}
