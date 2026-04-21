import type { ServiceChain, ServiceChainDetails, ServiceChainFlows } from '@cpn-console/shared'
import type { TestingModule } from '@nestjs/testing'
import type { MockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { AdminPermissionGuard } from '../../cpin-module/infrastructure/auth/admin-permission.guard'
import { ServiceChainController } from './service-chain.controller'
import { ServiceChainService } from './service-chain.service'

describe('serviceChainController', () => {
  let module: TestingModule
  let controller: ServiceChainController
  let service: MockProxy<ServiceChainService>

  const uuid = '550e8400-e29b-41d4-a716-446655440000'
  const date = new Date('2026-01-01T00:00:00.000Z')
  const serviceChain: ServiceChain = {
    id: uuid,
    state: 'opened',
    commonName: 'test.example.com',
    pai: 'test-pai',
    network: 'RIE',
    createdAt: date,
    updatedAt: date,
  }
  const serviceChainDetails: ServiceChainDetails = {
    ...serviceChain,
    validationId: uuid,
    validatedBy: null,
    ref: null,
    location: 'SIR',
    targetAddress: '10.0.0.1',
    projectId: uuid,
    env: 'INT',
    subjectAlternativeName: [],
    redirect: false,
    antivirus: null,
    websocket: false,
    ipWhiteList: [],
    sslOutgoing: false,
  }
  const serviceChainFlows: ServiceChainFlows = {
    reserve_ip: { state: 'success', input: {}, output: {}, updatedAt: date },
    create_cert: null,
    call_exec: { state: 'success', input: {}, output: {}, updatedAt: date },
    activate_ip: { state: 'success', input: {}, output: {}, updatedAt: date },
    dns_request: { state: 'success', input: {}, output: {}, updatedAt: date },
  }

  beforeEach(async () => {
    service = mock<ServiceChainService>()

    module = await Test.createTestingModule({
      controllers: [ServiceChainController],
      providers: [
        { provide: ServiceChainService, useValue: service },
      ],
    })
      .overrideGuard(AdminPermissionGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<ServiceChainController>(ServiceChainController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('list', () => {
    it('should call service.list()', async () => {
      const mockResult = [serviceChain]
      service.list.mockResolvedValue(mockResult)

      const result = await controller.list()

      expect(service.list).toHaveBeenCalled()
      expect(result).toEqual(mockResult)
    })
  })

  describe('getDetails', () => {
    it('should call service.getDetails() with id', async () => {
      const mockResult = serviceChainDetails
      service.getDetails.mockResolvedValue(mockResult)

      const result = await controller.getDetails(uuid)

      expect(service.getDetails).toHaveBeenCalledWith(uuid)
      expect(result).toEqual(mockResult)
    })
  })

  describe('retry', () => {
    it('should call service.retry() with id', async () => {
      service.retry.mockResolvedValue()

      await controller.retry(uuid)

      expect(service.retry).toHaveBeenCalledWith(uuid)
    })
  })

  describe('validate', () => {
    it('should call service.validate() with validationId', async () => {
      service.validate.mockResolvedValue()

      await controller.validate(uuid)

      expect(service.validate).toHaveBeenCalledWith(uuid)
    })
  })

  describe('getFlows', () => {
    it('should call service.getFlows() with id', async () => {
      const mockResult = serviceChainFlows
      service.getFlows.mockResolvedValue(mockResult)

      const result = await controller.getFlows(uuid)

      expect(service.getFlows).toHaveBeenCalledWith(uuid)
      expect(result).toEqual(mockResult)
    })
  })
})
