import { Module } from '@nestjs/common'
import { UserPermissionModule } from '../infrastructure/permission/user/user.module'
import { ServiceMonitorController } from './service-monitor.controller'
import { ServiceMonitorService } from './service-monitor.service'

@Module({
  imports: [UserPermissionModule],
  controllers: [ServiceMonitorController],
  providers: [ServiceMonitorService],
})
export class ServiceMonitorModule {}
