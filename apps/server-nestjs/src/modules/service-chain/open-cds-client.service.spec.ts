import type { ConfigType } from '@nestjs/config'
import type { TestingModule } from '@nestjs/testing'
import { HttpStatus } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { Agent, fetch, Headers, Response } from 'undici'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { baseConfigFactory } from '../../config/base.config'
import { serviceChainConfigFactory } from '../../config/service-chain.config'
import { OpenCdsClientService } from './open-cds-client.service'

vi.mock('undici', async (importOriginal) => {
  const actual = await importOriginal<typeof import('undici')>()

  return {
    ...actual,
    Agent: vi.fn(),
    fetch: vi.fn(),
  }
})

function mockFetchResponse(response: Response): void {
  vi.mocked(fetch).mockResolvedValue(response)
}

function getLastFetchCall(): [Request, unknown] {
  return vi.mocked(fetch).mock.lastCall as unknown as [Request, unknown]
}

describe('openCdsClientService', () => {
  let module: TestingModule
  let service: OpenCdsClientService
  let serviceCHainConfig: Partial<ConfigType<typeof serviceChainConfigFactory>>
  let baseConfig: ReturnType<typeof mockDeep<ConfigType<typeof baseConfigFactory>>>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    serviceCHainConfig = {
      url: 'https://opencds.example.com/root/api',
      apiToken: 'test-token',
      apiTlsRejectUnauthorized: true,
    }
    baseConfig = mockDeep<ConfigType<typeof baseConfigFactory>>()
    module = await Test.createTestingModule({
      providers: [
        OpenCdsClientService,
        { provide: serviceChainConfigFactory.KEY, useValue: serviceCHainConfig },
        { provide: baseConfigFactory.KEY, useValue: baseConfig },
      ],
    }).compile()

    service = module.get<OpenCdsClientService>(OpenCdsClientService)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('builds GET requests with an Axios-compatible URL, API key header and global dispatcher', async () => {
    mockFetchResponse(new Response(JSON.stringify({ ok: true }), {
      status: HttpStatus.OK,
      headers: {
        'content-type': 'application/json',
      },
    }))

    const result = await service.get<{ ok: boolean }>('/requests')

    const [request] = getLastFetchCall()
    expect(request.url).toBe('https://opencds.example.com/root/api/requests')
    expect(request.method).toBe('GET')
    expect(new Headers(request.headers).get('X-API-Key')).toBe('test-token')
    expect(result).toEqual({ ok: true })
  })

  it('applies query parameters on GET', async () => {
    mockFetchResponse(new Response(JSON.stringify({ ok: true }), {
      status: HttpStatus.OK,
      headers: {
        'content-type': 'application/json',
      },
    }))

    await service.get('/requests', {
      query: {
        page: 2,
        active: true,
        search: 'alpha',
      },
    })

    const [request] = getLastFetchCall()
    expect(request.url).toBe('https://opencds.example.com/root/api/requests?page=2&active=true&search=alpha')
  })

  it('sends POST<void> without body and without forcing JSON content type', async () => {
    mockFetchResponse(new Response(null, { status: HttpStatus.NO_CONTENT }))

    await service.post<void>('/validate/id')

    const [request] = getLastFetchCall()
    expect(request.url).toBe('https://opencds.example.com/root/api/validate/id')
    expect(request.method).toBe('POST')
    expect(request.body).toBeNull()
    expect(new Headers(request.headers).get('X-API-Key')).toBe('test-token')
    expect(new Headers(request.headers).has('Content-Type')).toBe(false)
  })

  it('serializes POST bodies as JSON and sets the content type', async () => {
    mockFetchResponse(new Response(null, { status: HttpStatus.NO_CONTENT }))

    await service.post('/validate/id', {
      requestId: '123',
      enabled: true,
    })

    const [request] = getLastFetchCall()
    expect(request.url).toBe('https://opencds.example.com/root/api/validate/id')
    expect(request.method).toBe('POST')
    expect(new Headers(request.headers).get('X-API-Key')).toBe('test-token')
    expect(new Headers(request.headers).get('Content-Type')).toBe('application/json')
    expect(await request.clone().json()).toEqual({
      requestId: '123',
      enabled: true,
    })
  })

  it('throws when OpenCDS is disabled', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('OpenCDS is disabled'))

    await expect(service.get('/requests')).rejects.toThrow('OpenCDS is disabled')
  })

  it('throws a dedicated error with HTTP status context for non-OK responses', async () => {
    mockFetchResponse(new Response('upstream failure', {
      status: HttpStatus.BAD_GATEWAY,
      statusText: 'Bad Gateway',
    }))

    await expect(service.get('/requests')).rejects.toMatchObject({
      body: 'upstream failure',
      message: 'OpenCDS request failed with 502 Bad Gateway',
      name: 'OpenCdsClientError',
      status: HttpStatus.BAD_GATEWAY,
      statusText: 'Bad Gateway',
    })
  })

  it('uses a local Agent with rejectUnauthorized:false when TLS verification is disabled', async () => {
    serviceCHainConfig = {
      ...serviceCHainConfig,
      apiTlsRejectUnauthorized: false,
    }
    module = await Test.createTestingModule({
      providers: [
        OpenCdsClientService,
        { provide: serviceChainConfigFactory.KEY, useValue: serviceCHainConfig },
        { provide: baseConfigFactory.KEY, useValue: baseConfig },
      ],
    }).compile()
    service = module.get<OpenCdsClientService>(OpenCdsClientService)

    mockFetchResponse(new Response(JSON.stringify({ ok: true }), {
      status: HttpStatus.OK,
      headers: { 'content-type': 'application/json' },
    }))

    await service.get<{ ok: boolean }>('/requests')

    expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: false } })
    const [request] = getLastFetchCall()
    expect(request).toBeDefined()
  })
})
