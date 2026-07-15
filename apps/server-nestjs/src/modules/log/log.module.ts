import { Module } from '@nestjs/common'
import { AuthModule } from '../infrastructure/auth/auth.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { ProjectPermissionModule } from '../infrastructure/permission/project/project.module'
import { UserPermissionModule } from '../infrastructure/permission/user/user.module'
import { LogController } from './log.controller'
import { LogService } from './log.service'

@Module({
  imports: [AuthModule, DatabaseModule, ProjectPermissionModule, UserPermissionModule],
  controllers: [LogController],
  providers: [LogService],
  exports: [LogService],
})
export class LogModule {}
