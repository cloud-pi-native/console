import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { ProjectHooksController } from '../project-hooks/project-hooks.controller'
import { ProjectServicesController } from '../project-services/project-services.controller'
import { ProjectServicesService } from '../project-services/project-services.service'
import { VaultModule } from '../vault/vault.module'
import { ProjectController } from './project.controller'
import { ProjectService } from './project.service'

@Module({
  imports: [InfrastructureModule, VaultModule],
  controllers: [ProjectController, ProjectHooksController, ProjectServicesController],
  providers: [
    ProjectService,
    ProjectServicesService,
  ],
  exports: [ProjectService, ProjectServicesService],
})
export class ProjectModule {}
