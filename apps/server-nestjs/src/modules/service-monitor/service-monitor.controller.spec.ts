import type { TestingModule } from '@nestjs/testing'
import type { MockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { ADMIN_PERMISSIONS_KEY } from '../infrastructure/permission/user/user-admin-permission.decorator'
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

  it('exposes health-services without UserGuard or admin permission', () => {
    const handler = ServiceMonitorController.prototype.getServiceHealth
    expect(Reflect.getMetadata('__guards__', handler)).toBeUndefined()
    expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, handler)).toBeUndefined()
  })

  it('guards complete-services with ListSystem', () => {
    const handler = ServiceMonitorController.prototype.getCompleteServiceHealth
    expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, handler)).toEqual(['ListSystem'])
  })

  it('guards refresh-services with ManageSystem', () => {
    const handler = ServiceMonitorController.prototype.refreshServiceHealth
    expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, handler)).toEqual(['ManageSystem'])
  })

  it('delegates health-services to the service', async () => {
    const health = [{ name: 'keycloak', status: 'up' }]
    service.getServiceHealth.mockResolvedValue(health)

    expect(await controller.getServiceHealth()).toBe(health)
    expect(service.getServiceHealth).toHaveBeenCalledTimes(1)
  })

  it('delegates complete-services to the service', async () => {
    const health = [{ name: 'keycloak', status: 'up' }]
    service.getCompleteServiceHealth.mockResolvedValue(health)

    expect(await controller.getCompleteServiceHealth()).toBe(health)
    expect(service.getCompleteServiceHealth).toHaveBeenCalledTimes(1)
  })

  it('delegates refresh-services to the service', async () => {
    const health = [{ name: 'keycloak', status: 'up' }]
    service.refreshServiceHealth.mockResolvedValue(health)

    expect(await controller.refreshServiceHealth()).toBe(health)
    expect(service.refreshServiceHealth).toHaveBeenCalledTimes(1)
  })
})
