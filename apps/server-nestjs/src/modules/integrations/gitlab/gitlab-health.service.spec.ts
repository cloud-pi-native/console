import type { TestingModule } from '@nestjs/testing'
import { HttpStatus } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { gitlabConfigFactory } from '../../../config/gitlab.config'
import { GitlabHealthService } from './gitlab-health.service'

const gitlabUrl = 'https://gitlab.internal'

const server = setupServer()

describe('gitlabHealthService', () => {
  let module: TestingModule
  let service: GitlabHealthService

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

  beforeEach(async () => {
    const config = mockDeep<ReturnType<typeof gitlabConfigFactory>>({
      token: 'test-token',
      url: 'https://gitlab.external',
      internalUrl: gitlabUrl,
      secretExposeInternalUrl: false,
      mirrorTokenExpirationDays: 365,
      mirrorTokenRotationThresholdDays: 250,
      projectRootDir: 'projects',
    })

    module = await Test.createTestingModule({
      providers: [
        { provide: gitlabConfigFactory.KEY, useValue: config },
        HealthIndicatorService,
        GitlabHealthService,
      ],
    }).compile()

    service = module.get(GitlabHealthService)
  })

  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('reports up when the internal health endpoint answers below 500', async () => {
    server.use(http.get(`${gitlabUrl}/-/health`, () => new Response(null, { status: HttpStatus.OK })))

    await expect(service.check()).resolves.toEqual({ gitlab: { status: 'up', httpStatus: HttpStatus.OK } })
  })

  it('reports down on a 5xx answer', async () => {
    server.use(http.get(`${gitlabUrl}/-/health`, () => new Response(null, { status: HttpStatus.SERVICE_UNAVAILABLE })))

    await expect(service.check()).resolves.toEqual({ gitlab: { status: 'down', httpStatus: HttpStatus.SERVICE_UNAVAILABLE } })
  })

  it('reports down with the error message when the endpoint is unreachable', async () => {
    server.use(http.get(`${gitlabUrl}/-/health`, () => HttpResponse.error()))

    const result = await service.check()
    expect(result.gitlab.status).toBe('down')
    expect(Object.values(result.gitlab).some(value => value !== 'down')).toBe(true)
  })

  it('prefers internalUrl over the public url', async () => {
    let requestedUrl: string | undefined
    server.use(http.get(`${gitlabUrl}/-/health`, ({ request }) => {
      requestedUrl = request.url
      return new Response(null, { status: HttpStatus.NO_CONTENT })
    }))

    await service.check()
    expect(requestedUrl).toBe(`${gitlabUrl}/-/health`)
  })
})
