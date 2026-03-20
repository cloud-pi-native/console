import type { TestingModule } from '@nestjs/testing'
import type { AxiosInstance } from 'axios'
import type { MockProxy } from 'vitest-mock-extended'
import axios from 'axios'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { OpenCdsClientService } from './open-cds-client.service'

vi.mock('axios', () => ({
  default: {
    create: vi.fn(),
  },
}))

describe('openCdsClientService', () => {
  let module: TestingModule
  let service: OpenCdsClientService
  let config: Partial<ConfigurationService>
  let axiosClient: MockProxy<AxiosInstance>

  beforeEach(async () => {
    vi.clearAllMocks()
    axiosClient = mock<AxiosInstance>()
    vi.mocked(axios.create).mockReturnValue(axiosClient)

    config = {
      openCdsUrl: 'https://opencds.example.com',
      openCdsApiToken: 'test-token',
      openCdsApiTlsRejectUnauthorized: true,
    }

    module = await Test.createTestingModule({
      providers: [
        OpenCdsClientService,
        { provide: ConfigurationService, useValue: config },
      ],
    }).compile()

    service = module.get<OpenCdsClientService>(OpenCdsClientService)
  })

  it('should create an axios client with OpenCDS configuration before GET', async () => {
    axiosClient.get.mockResolvedValue({ data: { ok: true } })

    const result = await service.get('/requests')

    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: 'https://opencds.example.com',
      headers: { 'X-API-Key': 'test-token' },
    }))
    expect(axiosClient.get).toHaveBeenCalledWith('/requests', undefined)
    expect(result).toEqual({ ok: true })
  })

  it('should delegate POST to the configured axios client', async () => {
    axiosClient.post.mockResolvedValue({ data: null })

    await service.post('/validate/id')

    expect(axiosClient.post).toHaveBeenCalledWith('/validate/id', undefined, undefined)
  })

  it('should throw when OpenCDS is disabled', async () => {
    config.openCdsUrl = undefined

    await expect(service.get('/requests')).rejects.toThrow('OpenCDS is disabled')
  })
})
