import { Module } from '@nestjs/common'
import { AuthModule as InfrastructureAuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { UserPermissionModule } from '../infrastructure/permission/user/user.module'
import { AuthController } from './auth.controller'
import { AuthUserService } from './auth.service'

@Module({
  imports: [InfrastructureAuthModule, DatabaseModule, UserPermissionModule],
  controllers: [AuthController],
  providers: [AuthUserService],
})
export class AuthModule {}
