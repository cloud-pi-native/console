import { Module } from '@nestjs/common'
import { AdminModule } from '../infrastructure/auth/admin/admin.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { SystemConfigController } from './system-config.controller'
import { SystemConfigService } from './system-config.service'

@Module({
  imports: [InfrastructureModule, AdminModule],
  controllers: [SystemConfigController],
  providers: [SystemConfigService],
})
export class SystemConfigModule {}
