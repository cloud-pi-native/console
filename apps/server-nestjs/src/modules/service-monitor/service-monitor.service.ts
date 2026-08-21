import type { ServiceStatus } from '@cpn-console/hooks'
import { Injectable } from '@nestjs/common'
import { services } from '@cpn-console/hooks'

@Injectable()
export class ServiceMonitorService {
  getServiceHealth(): ServiceStatus[] {
    return services.getStatus()
  }

  getCompleteServiceHealth(): ServiceStatus[] {
    return services.getStatus()
  }

  async refreshServiceHealth(): Promise<ServiceStatus[]> {
    await Promise.all(services.refreshStatus())
    return services.getStatus()
  }
}
