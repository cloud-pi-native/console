import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { ProjectHooksController } from '../project-hooks/project-hooks.controller'
import { ProjectHooksService } from '../project-hooks/project-hooks.service'
import { ProjectServicesController } from '../project-services/project-services.controller'
import { ProjectServicesService } from '../project-services/project-services.service'
import { ProjectController } from './project.controller'
import { ProjectService } from './project.service'

@Module({
  imports: [InfrastructureModule],
  controllers: [ProjectController, ProjectHooksController, ProjectServicesController],
  providers: [
    ProjectService,
    ProjectHooksService,
    ProjectServicesService,
  ],
  exports: [ProjectService, ProjectHooksService, ProjectServicesService],
})
export class ProjectModule {}
