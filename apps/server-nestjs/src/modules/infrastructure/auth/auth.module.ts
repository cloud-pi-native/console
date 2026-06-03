import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { AdminPermissionGuard } from './admin-permission.guard'
import { AuthService } from './auth.service'
import { ProjectLockedGuard } from './project-locked.guard'
import { ProjectPermissionGuard } from './project-permission.guard'
import { ProjectStatusGuard } from './project-status.guard'
import { ProjectContextGuard } from './project.guard'
import { UserTypeGuard } from './user-type.guard'
import { UserGuard } from './user.guard'

@Module({
  imports: [DatabaseModule],
  providers: [
    AuthService,
    UserGuard,
    AdminPermissionGuard,
    UserTypeGuard,
    ProjectContextGuard,
    ProjectStatusGuard,
    ProjectLockedGuard,
    ProjectPermissionGuard,
  ],
  exports: [
    AuthService,
    UserGuard,
    AdminPermissionGuard,
    UserTypeGuard,
    ProjectContextGuard,
    ProjectStatusGuard,
    ProjectLockedGuard,
    ProjectPermissionGuard,
  ],
})
export class AuthModule {}
