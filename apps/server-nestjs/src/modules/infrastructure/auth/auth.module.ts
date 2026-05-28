import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { AdminPermissionGuard } from './admin-permission.guard'
import { AuthService } from './auth.service'
import { ProjectLockedGuard } from './project-locked.guard'
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
  ],
  exports: [
    AuthService,
    UserGuard,
    AdminPermissionGuard,
    UserTypeGuard,
    ProjectContextGuard,
    ProjectStatusGuard,
    ProjectLockedGuard,
  ],
})
export class AuthModule {}
