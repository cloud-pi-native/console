import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { ProjectHooksModule } from '../project-hooks/project-hooks.module'
import { ProjectModule } from '../project/project.module'
import { ProjectBulkController } from './project-bulk.controller'
import { ProjectBulkService } from './project-bulk.service'

@Module({
  imports: [InfrastructureModule, ProjectModule, ProjectHooksModule],
  controllers: [ProjectBulkController],
  providers: [ProjectBulkService],
})
export class ProjectBulkModule {}
