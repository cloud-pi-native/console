import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { UserModule } from '../infrastructure/permission/user/user.module'
import { SystemConfigController } from './system-config.controller'
import { SystemConfigService } from './system-config.service'

@Module({
  imports: [InfrastructureModule, UserModule],
  controllers: [SystemConfigController],
  providers: [SystemConfigService],
})
export class SystemConfigModule {}
