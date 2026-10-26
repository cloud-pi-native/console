import type { TestingModule } from '@nestjs/testing'
import { HealthIndicatorService } from '@nestjs/terminus'
import { Test } from '@nestjs/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GitlabHealthService } from './gitlab-health.service'

describe('gitlabHealthService', () => {
  let module: TestingModule
  let service: GitlabHealthService
  let indicator: { check: ReturnType<typeof vi.fn>, up: ReturnType<typeof vi.fn>, down: ReturnType<typeof vi.fn> }
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    indicator = {
      check: vi.fn().mockReturnThis(),
      up: vi.fn().mockImplementation(details => ({ gitlab: { status: 'up', ...details } })),
      down: vi.fn().mockImplementation(details => ({ gitlab: { status: 'down', ...details } })),
    }
    module = await Test.createTestingModule({
      providers: [
        { provide: HealthIndicatorService, useValue: indicator },
        {
          provide: GitlabHealthService,
          useFactory: (healthIndicator: HealthIndicatorService) =>
            new GitlabHealthService({ internalUrl: 'https://gitlab.internal', url: 'https://gitlab.external' } as any, healthIndicator),
          inject: [HealthIndicatorService],
        },
      ],
    }).compile()
    service = module.get(GitlabHealthService)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports up when the internal health endpoint answers below 500', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
    const result = await service.check()
    expect(fetchMock).toHaveBeenCalledWith('https://gitlab.internal/-/health')
    expect(result.gitlab.status).toBe('up')
  })

  it('reports down on a 5xx answer', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }))
    const result = await service.check()
    expect(result.gitlab.status).toBe('down')
    expect(result.gitlab.httpStatus).toBe(503)
  })

  it('reports down with the error message when fetch rejects', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'))
    const result = await service.check()
    expect(result.gitlab.status).toBe('down')
    expect(indicator.down).toHaveBeenCalledWith('connect ECONNREFUSED')
  })

  it('prefers internalUrl over the public url', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await service.check()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain('gitlab.internal')
  })
})
