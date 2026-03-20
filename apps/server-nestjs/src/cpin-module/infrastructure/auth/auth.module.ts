import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { AdminPermissionGuard } from './admin-permission.guard'
import { AuthService } from './auth.service'

@Module({
  imports: [DatabaseModule],
  providers: [AuthService, AdminPermissionGuard],
  exports: [AuthService, AdminPermissionGuard],
})
export class AuthModule {}
