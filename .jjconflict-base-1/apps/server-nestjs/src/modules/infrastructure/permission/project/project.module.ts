import { Module } from '@nestjs/common'
import { AuthModule } from '../../auth/auth.module'
import { DatabaseModule } from '../../database/database.module'
import { ProjectPermissionLoaderService } from './project-loader.service'
import { ProjectGuard } from './project.guard'
import { ProjectPermissionPolicy } from './project.policy'
import { ProjectPermissionService } from './project.service'

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
  ],
  providers: [
    ProjectGuard,
    ProjectPermissionLoaderService,
    ProjectPermissionService,
    ProjectPermissionPolicy,
  ],
  exports: [
    ProjectGuard,
    ProjectPermissionLoaderService,
    ProjectPermissionService,
    ProjectPermissionPolicy,
  ],
})
export class ProjectPermissionModule {}
