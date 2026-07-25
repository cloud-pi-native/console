import { Module } from '@nestjs/common'
import { ProjectPermissionModule } from './project/project.module'
import { UserPermissionModule } from './user/user.module'

@Module({
  imports: [UserPermissionModule, ProjectPermissionModule],
  exports: [UserPermissionModule, ProjectPermissionModule],
})
export class PermissionModule {}
