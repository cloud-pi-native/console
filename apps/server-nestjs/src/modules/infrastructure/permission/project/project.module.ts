import { Module } from '@nestjs/common'
import { DatabaseModule } from '../../database/database.module'
import { ProjectLoaderService } from './project-loader.service'
import { ProjectGuard } from './project.guard'
import { ProjectPolicy } from './project.policy'
import { ProjectService } from './project.service'

@Module({
  imports: [DatabaseModule],
  providers: [
    ProjectGuard,
    ProjectLoaderService,
    ProjectService,
    ProjectPolicy,
  ],
  exports: [
    ProjectGuard,
    ProjectLoaderService,
    ProjectService,
    ProjectPolicy,
  ],
})
export class ProjectModule {}
