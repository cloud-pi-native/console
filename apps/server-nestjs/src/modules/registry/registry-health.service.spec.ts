import type { HarborConfig } from '../../config/harbor.config'
import { HealthIndicatorService } from '@nestjs/terminus'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { harborConfigFactory } from '../../config/harbor.config'
import { RegistryHealthService } from './registry-health.service'

const harborUrl = 'https://harbor.example'
const healthUrl = `${harborUrl}/api/v2.0/health`

const server = setupServer()

describe('registryHealthService', () => {
  let service: RegistryHealthService

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

  beforeEach(async () => {
    const config = mockDeep<HarborConfig>({
      url: harborUrl,
      internalUrl: undefined,
      admin: 'admin',
      adminPassword: 'password',
    })

    const module = await Test.createTestingModule({
      providers: [
        RegistryHealthService,
        { provide: harborConfigFactory.KEY, useValue: config },
        HealthIndicatorService,
      ],
    }).compile()

    service = module.get(RegistryHealthService)
  })
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('reports up when every component is healthy', async () => {
    server.use(http.get(healthUrl, () => HttpResponse.json({ status: 'healthy', components: [] })))

    await expect(service.check()).resolves.toEqual({ harbor: { status: 'up' } })
  })

  it('reports down when a core component is unhealthy', async () => {
    server.use(http.get(healthUrl, () => HttpResponse.json({
      status: 'unhealthy',
      components: [{ name: 'registryctl', status: 'unhealthy' }],
    })))

    await expect(service.check()).resolves.toEqual({ harbor: { status: 'down', message: 'Service en erreur' } })
  })

  it('reports a degraded up when only a non-core component is unhealthy', async () => {
    server.use(http.get(healthUrl, () => HttpResponse.json({
      status: 'unhealthy',
      components: [{ name: 'jobservice', status: 'unhealthy' }],
    })))

    await expect(service.check()).resolves.toEqual({ harbor: { status: 'up', message: 'Service dégradé' } })
  })

  it('reports down when the health endpoint does not answer with a 200', async () => {
    server.use(http.get(healthUrl, () => new HttpResponse(null, { status: 503 })))

    await expect(service.check()).resolves.toEqual({ harbor: { status: 'down', message: 'Fatal Error' } })
  })

  it('reports down with the cause when the request fails', async () => {
    server.use(http.get(healthUrl, () => HttpResponse.error()))

    await expect(service.check()).resolves.toMatchObject({
      harbor: { status: 'down', message: 'Erreur lors la requête', cause: expect.any(Error) },
    })
  })
})
