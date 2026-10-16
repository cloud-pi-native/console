import type { TestingModule } from '@nestjs/testing'
import type { MockProxy } from 'vitest-mock-extended'
import type { ServiceHealth } from './service-monitor.service'
import { MonitorStatus } from '@cpn-console/shared'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ServiceMonitorController } from './service-monitor.controller'
import { ServiceMonitorService } from './service-monitor.service'

describe('serviceMonitorController', () => {
  let module: TestingModule
  let controller: ServiceMonitorController
  let service: MockProxy<ServiceMonitorService>

  beforeEach(async () => {
    service = mock<ServiceMonitorService>()

    module = await Test.createTestingModule({
      controllers: [ServiceMonitorController],
      providers: [
        { provide: ServiceMonitorService, useValue: service },
      ],
    })
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<ServiceMonitorController>(ServiceMonitorController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('strips the cause from the public route', async () => {
    const health: ServiceHealth[] = [{ name: 'keycloak', status: MonitorStatus.ERROR, message: 'down', interval: 1000, lastUpdateTimestamp: 0, cause: 'connection refused' }]
    service.getServiceHealth.mockResolvedValue(health)

    await expect(controller.getServiceHealth()).resolves.toEqual([{ name: 'keycloak', status: MonitorStatus.ERROR, message: 'down', interval: 1000, lastUpdateTimestamp: 0 }])
    expect(service.getServiceHealth).toHaveBeenCalledTimes(1)
  })

  it('delegates complete-services to the service, formatting the cause', async () => {
    const health: ServiceHealth[] = [{ name: 'keycloak', status: MonitorStatus.OK, message: MonitorStatus.OK, interval: 1000, lastUpdateTimestamp: 0, cause: new Error('boom') }]
    service.getServiceHealth.mockResolvedValue(health)

    await expect(controller.getCompleteServiceHealth()).resolves.toEqual([{ name: 'keycloak', status: MonitorStatus.OK, message: MonitorStatus.OK, interval: 1000, lastUpdateTimestamp: 0, cause: 'boom' }])
    expect(service.getServiceHealth).toHaveBeenCalledTimes(1)
  })

  it('delegates refresh-services to the service, formatting the cause', async () => {
    const health: ServiceHealth[] = [{ name: 'keycloak', status: MonitorStatus.ERROR, message: 'down', interval: 1000, lastUpdateTimestamp: 0, cause: new Error('boom') }]
    service.refreshServiceHealth.mockResolvedValue(health)

    await expect(controller.refreshServiceHealth()).resolves.toEqual([{ name: 'keycloak', status: MonitorStatus.ERROR, message: 'down', interval: 1000, lastUpdateTimestamp: 0, cause: 'boom' }])
    expect(service.refreshServiceHealth).toHaveBeenCalledTimes(1)
  })
})
