import { Controller, Get, Inject, UseGuards } from '@nestjs/common'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ServiceMonitorService as ServiceMonitorServiceImpl } from './service-monitor.service'

@Controller('api/v1')
export class ServiceMonitorController {
  constructor(
    @Inject(ServiceMonitorServiceImpl) private readonly service: ServiceMonitorServiceImpl,
  ) {}

  @Get('health-services')
  getServiceHealth() {
    return this.service.getServiceHealth()
  }

  @Get('complete-services')
  @UseGuards(UserGuard)
  @RequireAdminPermission('ListSystem')
  getCompleteServiceHealth() {
    return this.service.getCompleteServiceHealth()
  }

  @Get('refresh-services')
  @UseGuards(UserGuard)
  @RequireAdminPermission('ManageSystem')
  async refreshServiceHealth() {
    return this.service.refreshServiceHealth()
  }
}
