import type { ConfigType } from '@nestjs/config'
import { MonitorStatus } from '@cpn-console/shared'
import { HealthIndicatorService } from '@nestjs/terminus'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { sonarqubeConfigFactory } from '../../config/sonarqube.config'
import { SonarqubeHealthService } from './sonarqube-health.service'

const sonarUrl = 'https://sonarqube.internal'
const healthUrl = `${sonarUrl}/api/system/health`

const server = setupServer()

describe('sonarqubeHealthService', () => {
  let service: SonarqubeHealthService

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

  beforeEach(async () => {
    const config = mockDeep<ConfigType<typeof sonarqubeConfigFactory>>({
      apiToken: 'my-token',
      url: sonarUrl,
      internalUrl: undefined,
    })

    const module = await Test.createTestingModule({
      providers: [
        SonarqubeHealthService,
        { provide: sonarqubeConfigFactory.KEY, useValue: config },
        { provide: HealthIndicatorService, useValue: mockDeep<HealthIndicatorService>() },
      ],
    }).compile()

    service = module.get(SonarqubeHealthService)
  })
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it.each([
    ['GREEN', MonitorStatus.OK, MonitorStatus.OK],
    ['YELLOW', MonitorStatus.WARNING, 'Service dégradé'],
    ['RED', MonitorStatus.ERROR, 'Service en panne'],
  ])('maps SonarQube health %s to %s', async (health, status, message) => {
    server.use(http.get(healthUrl, () => HttpResponse.json({ health, causes: [] })))

    await expect(service.monitor()).resolves.toEqual({ status, message })
  })

  it('reports UNKNOW when the API answers without a health field', async () => {
    server.use(http.get(healthUrl, () => HttpResponse.json({})))

    await expect(service.monitor()).resolves.toEqual({ status: MonitorStatus.UNKNOW, message: 'Erreur lors la requête' })
  })

  it('reports UNKNOW when the API answers with a non-200 status', async () => {
    server.use(http.get(healthUrl, () => new HttpResponse(null, { status: 503 })))

    await expect(service.monitor()).resolves.toEqual({ status: MonitorStatus.UNKNOW, message: 'Erreur lors la requête' })
  })

  it('reports UNKNOW with the cause when the request fails', async () => {
    server.use(http.get(healthUrl, () => HttpResponse.error()))

    await expect(service.monitor()).resolves.toMatchObject({ status: MonitorStatus.UNKNOW, cause: expect.any(Error) })
  })
})