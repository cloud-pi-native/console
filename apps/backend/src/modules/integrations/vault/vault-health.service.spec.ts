import type { ConfigType } from '@nestjs/config'
import { HttpStatus } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { vaultConfigFactory } from '../../../config/vault.config'
import { VaultHealthService } from './vault-health.service'

const vaultUrl = 'https://vault.internal'

const server = setupServer()

describe('vaultHealthService', () => {
  let service: VaultHealthService

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

  beforeEach(async () => {
    const config = mockDeep<ConfigType<typeof vaultConfigFactory>>({
      url: vaultUrl,
      internalUrl: undefined,
      token: 'token',
      kvName: 'kv',
    })

    const module = await Test.createTestingModule({
      providers: [
        VaultHealthService,
        { provide: vaultConfigFactory.KEY, useValue: config },
        HealthIndicatorService,
      ],
    }).compile()

    service = module.get(VaultHealthService)
  })
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('reports up when Vault answers below 5xx', async () => {
    server.use(http.get(`${vaultUrl}/v1/sys/health`, () => HttpResponse.json({ initialized: true }, { status: HttpStatus.OK })))

    await expect(service.check()).resolves.toEqual({ vault: { status: 'up', httpStatus: HttpStatus.OK } })
  })

  it('uses internalUrl when configured', async () => {
    let requestedUrl: string | undefined
    server.use(http.get(`${vaultUrl}/v1/sys/health`, ({ request }) => {
      requestedUrl = request.url
      return HttpResponse.json({}, { status: HttpStatus.OK })
    }))

    const config = mockDeep<ConfigType<typeof vaultConfigFactory>>({
      url: 'https://vault.public',
      internalUrl: vaultUrl,
      token: 'token',
      kvName: 'kv',
    })
    const module = await Test.createTestingModule({
      providers: [
        VaultHealthService,
        { provide: vaultConfigFactory.KEY, useValue: config },
        HealthIndicatorService,
      ],
    }).compile()
    service = module.get(VaultHealthService)

    await service.check()

    expect(requestedUrl).toBe(`${vaultUrl}/v1/sys/health`)
  })

  it('reports down when Vault answers with a 5xx', async () => {
    server.use(http.get(`${vaultUrl}/v1/sys/health`, () => HttpResponse.json({}, { status: HttpStatus.SERVICE_UNAVAILABLE })))

    await expect(service.check()).resolves.toEqual({ vault: { status: 'down', httpStatus: HttpStatus.SERVICE_UNAVAILABLE } })
  })

  it('reports down with the cause when the request fails', async () => {
    server.use(http.get(`${vaultUrl}/v1/sys/health`, () => HttpResponse.error()))

    await expect(service.check()).resolves.toMatchObject({
      vault: { message: 'Failed to fetch' },
    })
  })
})
