import { Module } from '@nestjs/common'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { UserPermissionModule } from '../infrastructure/permission/user/user.module'
import { SystemConfigController } from './system-config.controller'
import { SystemConfigService } from './system-config.service'

@Module({
  imports: [DatabaseModule, UserPermissionModule],
  controllers: [SystemConfigController],
  providers: [SystemConfigService],
})
export class SystemConfigModule {}
