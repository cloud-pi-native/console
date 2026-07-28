import type { TestingModule } from '@nestjs/testing'
import type { RequestInit } from 'undici'
import { HttpStatus } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { Agent, fetch, Headers, Response } from 'undici'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { OpenCdsClientError, OpenCdsClientService } from './open-cds-client.service'

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

function getLastFetchCall(): [string, RequestInit] {
  const [url, init] = vi.mocked(fetch).mock.lastCall as [string, RequestInit]
  return [url, init]
}

describe('openCdsClientService', () => {
  let module: TestingModule
  let service: OpenCdsClientService
  let config: Partial<ConfigurationService>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()

    config = {
      openCdsUrl: 'https://opencds.example.com/root/api/',
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

  it('builds GET requests with an Axios-compatible URL, API key header and global dispatcher', async () => {
    mockFetchResponse(new Response(JSON.stringify({ ok: true }), {
      status: HttpStatus.OK,
      headers: {
        'content-type': 'application/json',
      },
    }))

    const result = await service.get<{ ok: boolean }>('/requests')

    const [url, init] = getLastFetchCall()
    expect(url).toBe('https://opencds.example.com/root/api/requests')
    expect(init.dispatcher).toBeUndefined()
    expect(init.method).toBe('GET')
    expect(init.signal).toBeUndefined()
    expect(new Headers(init.headers).get('X-API-Key')).toBe('test-token')
    expect(result).toEqual({ ok: true })
  })

  it('applies query parameters and omits undefined values on GET', async () => {
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
        ignored: undefined,
      },
    })

    const [url] = getLastFetchCall()
    expect(url).toBe('https://opencds.example.com/root/api/requests?page=2&active=true&search=alpha')
  })

  it('sends POST<void> without body and without forcing JSON content type', async () => {
    mockFetchResponse(new Response(null, { status: HttpStatus.NO_CONTENT }))

    await service.post<void>('/validate/id')

    const [url, init] = getLastFetchCall()
    expect(url).toBe('https://opencds.example.com/root/api/validate/id')
    expect(init.dispatcher).toBeUndefined()
    expect(init.method).toBe('POST')
    expect(init.signal).toBeUndefined()
    expect(init.body).toBeUndefined()
    expect(new Headers(init.headers).get('X-API-Key')).toBe('test-token')
    expect(new Headers(init.headers).has('Content-Type')).toBe(false)
  })

  it('serializes POST bodies as JSON and sets the content type', async () => {
    mockFetchResponse(new Response(null, { status: HttpStatus.NO_CONTENT }))

    await service.post('/validate/id', {
      requestId: '123',
      enabled: true,
    })

    const [url, init] = getLastFetchCall()
    expect(url).toBe('https://opencds.example.com/root/api/validate/id')
    expect(init.body).toBe(JSON.stringify({
      requestId: '123',
      enabled: true,
    }))
    expect(init.dispatcher).toBeUndefined()
    expect(init.method).toBe('POST')
    expect(init.signal).toBeUndefined()
    expect(new Headers(init.headers).get('X-API-Key')).toBe('test-token')
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })

  it('throws when OpenCDS is disabled', async () => {
    config.openCdsUrl = undefined

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
      name: OpenCdsClientError.name,
      status: HttpStatus.BAD_GATEWAY,
      statusText: 'Bad Gateway',
    })
  })

  it('uses a local Agent with rejectUnauthorized:false when TLS verification is disabled', async () => {
    config = {
      ...config,
      openCdsApiTlsRejectUnauthorized: false,
    }
    module = await Test.createTestingModule({
      providers: [
        OpenCdsClientService,
        { provide: ConfigurationService, useValue: config },
      ],
    }).compile()
    service = module.get<OpenCdsClientService>(OpenCdsClientService)

    mockFetchResponse(new Response(JSON.stringify({ ok: true }), {
      status: HttpStatus.OK,
      headers: { 'content-type': 'application/json' },
    }))

    await service.get<{ ok: boolean }>('/requests')

    expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: false } })
    const [, init] = getLastFetchCall()
    expect(init.dispatcher).toBeDefined()
  })
})
