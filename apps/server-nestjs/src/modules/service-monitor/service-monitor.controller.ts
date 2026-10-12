import type { ServiceHealth } from './service-monitor.service'
import { Controller, Get, Inject, UseGuards } from '@nestjs/common'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ServiceMonitorService } from './service-monitor.service'
import { toCause } from './service-monitor.utils'

function toServiceHealth({ cause, ...health }: ServiceHealth): ServiceHealth {
  return { ...health, ...(cause !== undefined ? { cause: toCause(cause) } : {}) }
}

// MonitorInfos.cause is admin-only
function toPublicServiceHealth({ cause, ...health }: ServiceHealth): ServiceHealth {
  return health
}

@Controller('api/v1')
export class ServiceMonitorController {
  constructor(
    @Inject(ServiceMonitorService) private readonly service: ServiceMonitorService,
  ) {}

  @Get('health-services')
  getServiceHealth() {
    return this.service.getServiceHealth().then(health => health.map(toPublicServiceHealth))
  }

  @Get('complete-services')
  @UseGuards(UserGuard)
  @RequireAdminPermission('ListSystem')
  getCompleteServiceHealth() {
    return this.service.getServiceHealth().then(health => health.map(toServiceHealth))
  }

  @Get('refresh-services')
  @UseGuards(UserGuard)
  @RequireAdminPermission('ManageSystem')
  refreshServiceHealth() {
    return this.service.refreshServiceHealth().then(health => health.map(toServiceHealth))
  }
}
