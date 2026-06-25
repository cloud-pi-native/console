import { Module } from '@nestjs/common'
import { AuthModule } from '../../infrastructure/auth/auth.module'
import { InfrastructureModule } from '../../infrastructure/infrastructure.module'
import { KeycloakModule } from '../../plugins/keycloak/keycloak.module'
import { ProjectMembersController } from './project-members.controller'
import { ProjectMembersService } from './project-members.service'

@Module({
  imports: [InfrastructureModule, AuthModule, KeycloakModule],
  controllers: [ProjectMembersController],
  providers: [ProjectMembersService],
})
export class ProjectMembersModule {}
