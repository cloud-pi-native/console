import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { ProjectDatastoreService } from './project-datastore.service'
import { ProjectService } from './project.service'

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
