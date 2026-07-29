import { Module } from '@nestjs/common'
import { ProjectPermissionModule } from './project/project.module'
import { UserPermissionModule } from './user/user.module'

@Module({
  imports: [ProjectPermissionModule, UserPermissionModule],
  exports: [ProjectPermissionModule, UserPermissionModule],
})
export class PermissionModule {}
