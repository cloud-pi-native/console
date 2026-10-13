import type { ConfigType } from '@nestjs/config'
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
        HealthIndicatorService,
      ],
    }).compile()

    service = module.get(SonarqubeHealthService)
  })
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it.each([
    ['GREEN', { status: 'up' }],
    ['YELLOW', { status: 'up', message: 'Service dégradé' }],
    ['RED', { status: 'down', message: 'Service en panne' }],
  ])('maps SonarQube health %s', async (health, expected) => {
    server.use(http.get(healthUrl, () => HttpResponse.json({ health, causes: [] })))

    await expect(service.check()).resolves.toEqual({ sonarqube: expected })
  })

  it('sends the raw api token under Bearer', async () => {
    let authorization: string | undefined
    server.use(http.get(healthUrl, ({ request }) => {
      authorization = request.headers.get('authorization') ?? undefined
      return HttpResponse.json({ health: 'GREEN', causes: [] })
    }))

    await expect(service.check()).resolves.toEqual({ sonarqube: { status: 'up' } })
    expect(authorization).toBe('Bearer my-token')
  })

  it('reports down when the API answers without a health field', async () => {
    server.use(http.get(healthUrl, () => HttpResponse.json({})))

    await expect(service.check()).resolves.toEqual({ sonarqube: { status: 'down', message: 'Erreur lors la requête' } })
  })

  it('reports down when the API answers with a non-200 status', async () => {
    server.use(http.get(healthUrl, () => new HttpResponse(null, { status: 503 })))

    await expect(service.check()).resolves.toEqual({ sonarqube: { status: 'down', message: 'Erreur lors la requête' } })
  })

  it('reports down with the cause when the request fails', async () => {
    server.use(http.get(healthUrl, () => HttpResponse.error()))

    await expect(service.check()).resolves.toMatchObject({
      sonarqube: { status: 'down', message: 'Erreur lors la requête', cause: expect.any(Error) },
    })
  })
})
