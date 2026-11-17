import { Module } from '@nestjs/common'
import { AuthModule } from '../../infrastructure/auth/auth.module'
import { DatabaseModule } from '../../infrastructure/database/database.module'
import { UserPermissionModule } from '../../infrastructure/permission/user/user.module'
import { PluginModule } from '../plugin/plugin.module'
import { SystemConfigController } from './system-config.controller'
import { SystemConfigService } from './system-config.service'

@Module({
  imports: [DatabaseModule, UserPermissionModule, AuthModule, PluginModule],
  controllers: [SystemConfigController],
  providers: [SystemConfigService],
})
export class SystemConfigModule {}
