import { Controller, Get, UseGuards } from '@nestjs/common'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ServiceMonitorService } from './service-monitor.service'

@Controller('api/v1')
export class ServiceMonitorController {
  constructor(private readonly service: ServiceMonitorService) {}

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
