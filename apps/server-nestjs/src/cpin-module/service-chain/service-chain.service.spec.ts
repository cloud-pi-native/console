import type { TestingModule } from '@nestjs/testing'
import type { MockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { OpenCdsClientService } from './open-cds-client.service'
import { ServiceChainService } from './service-chain.service'

describe('serviceChainService', () => {
  let module: TestingModule
  let service: ServiceChainService
  let openCdsClient: MockProxy<OpenCdsClientService>

  beforeEach(async () => {
    openCdsClient = mock<OpenCdsClientService>()

    module = await Test.createTestingModule({
      providers: [
        ServiceChainService,
        { provide: OpenCdsClientService, useValue: openCdsClient },
      ],
    }).compile()

    service = module.get<ServiceChainService>(ServiceChainService)
  })

  const uuid = '550e8400-e29b-41d4-a716-446655440000'

  const mockServiceChain = {
    id: uuid,
    state: 'opened',
    commonName: 'test.example.com',
    pai: 'test-pai',
    network: 'RIE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  describe('list', () => {
    it('should call GET /requests and parse response', async () => {
      openCdsClient.get.mockResolvedValue([mockServiceChain])

      const result = await service.list()

      expect(openCdsClient.get).toHaveBeenCalledWith('/requests')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(uuid)
    })
  })

  describe('getDetails', () => {
    it('should call GET /requests/:id and parse response', async () => {
      const detailsData = {
        ...mockServiceChain,
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
      openCdsClient.get.mockResolvedValue(detailsData)

      const result = await service.getDetails(uuid)

      expect(openCdsClient.get).toHaveBeenCalledWith(`/requests/${uuid}`)
      expect(result.id).toBe(uuid)
      expect(result.location).toBe('SIR')
    })
  })

  describe('retry', () => {
    it('should call POST /requests/:id/retry', async () => {
      openCdsClient.post.mockResolvedValue()

      await service.retry(uuid)

      expect(openCdsClient.post).toHaveBeenCalledWith(`/requests/${uuid}/retry`)
    })
  })

  describe('validate', () => {
    it('should call POST /validate/:validationId', async () => {
      openCdsClient.post.mockResolvedValue()

      await service.validate(uuid)

      expect(openCdsClient.post).toHaveBeenCalledWith(`/validate/${uuid}`)
    })
  })

  describe('getFlows', () => {
    it('should call GET /requests/:id/flows and parse response', async () => {
      const flowDetails = {
        state: 'success',
        input: '{}',
        output: '{}',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      const flowsData = {
        reserve_ip: flowDetails,
        create_cert: null,
        call_exec: flowDetails,
        activate_ip: flowDetails,
        dns_request: flowDetails,
      }
      openCdsClient.get.mockResolvedValue(flowsData)

      const result = await service.getFlows(uuid)

      expect(openCdsClient.get).toHaveBeenCalledWith(`/requests/${uuid}/flows`)
      expect(result.reserve_ip.state).toBe('success')
      expect(result.create_cert).toBeNull()
    })
  })
})
