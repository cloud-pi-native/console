import { Module } from '@nestjs/common'
import { AppEventsModule } from '../events/app-events.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { ProjectRolesController } from './project-roles.controller'
import { ProjectRolesService } from './project-roles.service'

@Module({
  imports: [AppEventsModule, InfrastructureModule],
  controllers: [ProjectRolesController],
  providers: [ProjectRolesService],
  exports: [ProjectRolesService],
})
export class ProjectRolesModule {}
