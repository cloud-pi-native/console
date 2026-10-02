import type { TestingModule } from '@nestjs/testing'
import type { MockProxy } from 'vitest-mock-extended'
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

  it('delegates health-services to the service', async () => {
    const health = [{ name: 'keycloak', status: 'up' }]
    service.getServiceHealth.mockResolvedValue(health)

    await expect(controller.getServiceHealth()).resolves.toBe(health)
    expect(service.getServiceHealth).toHaveBeenCalledTimes(1)
  })

  it('delegates complete-services to the service', async () => {
    const health = [{ name: 'keycloak', status: 'up' }]
    service.getCompleteServiceHealth.mockResolvedValue(health)

    await expect(controller.getCompleteServiceHealth()).resolves.toBe(health)
    expect(service.getCompleteServiceHealth).toHaveBeenCalledTimes(1)
  })

  it('delegates refresh-services to the service', async () => {
    const health = [{ name: 'keycloak', status: 'up' }]
    service.refreshServiceHealth.mockResolvedValue(health)

    expect(await controller.refreshServiceHealth()).toBe(health)
    expect(service.refreshServiceHealth).toHaveBeenCalledTimes(1)
  })
})
