import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module.js'
import { ProjectDatastoreService } from './project-datastore.service.js'
import { ProjectService } from './project.service.js'

@Module({
  imports: [InfrastructureModule],
  controllers: [],
  providers: [
    ProjectService,
    ProjectDatastoreService,
  ],
  exports: [ProjectService],
})
export class ProjectModule {}
