import { Module } from '@nestjs/common'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { UserPermissionModule } from '../infrastructure/permission/user/user.module'
import { StageController } from './stage.controller'
import { StageService } from './stage.service'

@Module({
  imports: [AuthModule, DatabaseModule, UserPermissionModule],
  controllers: [StageController],
  providers: [StageService],
  exports: [StageService],
})
export class StageModule {}
