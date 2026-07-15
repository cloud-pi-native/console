import { Module } from '@nestjs/common'
import { AuthModule } from '../../auth/auth.module'
import { DatabaseModule } from '../../database/database.module'
import { UserPermissionPolicy } from './user-policy.service'
import { UserGuard } from './user.guard'
import { UserPermissionService } from './user.service'

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
  ],
  providers: [
    UserGuard,
    UserPermissionService,
    UserPermissionPolicy,
  ],
  exports: [
    UserGuard,
    UserPermissionService,
    UserPermissionPolicy,
  ],
})
export class UserPermissionModule {}
