import { Module } from '@nestjs/common'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { UserPermissionModule } from '../infrastructure/permission/user/user.module'
import { UserTokensController } from './user-tokens.controller'
import { UserTokensService } from './user-tokens.service'

@Module({
  imports: [AuthModule, DatabaseModule, UserPermissionModule],
  controllers: [UserTokensController],
  providers: [UserTokensService],
  exports: [UserTokensService],
})
export class UserTokensModule {}
