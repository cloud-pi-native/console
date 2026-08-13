import type { ServiceStatus } from '@cpn-console/hooks'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { services } from '@cpn-console/hooks'
import { ServiceMonitorService } from './service-monitor.service'

vi.mock('@cpn-console/hooks', () => ({
  services: {
    getStatus: vi.fn(),
    refreshStatus: vi.fn(),
  },
}))

describe('ServiceMonitorService', () => {
  let service: ServiceMonitorService
  const health = [{ name: 'argocd', status: 'up' }] as unknown as ServiceStatus[]

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ServiceMonitorService()
  })

  it('getServiceHealth returns current service status', () => {
    vi.mocked(services.getStatus).mockReturnValue(health)

    expect(service.getServiceHealth()).toEqual(health)
    expect(services.getStatus).toHaveBeenCalledTimes(1)
  })

  it('getCompleteServiceHealth returns current service status (admin scoped)', () => {
    vi.mocked(services.getStatus).mockReturnValue(health)

    expect(service.getCompleteServiceHealth()).toEqual(health)
    expect(services.getStatus).toHaveBeenCalledTimes(1)
  })

  it('refreshServiceHealth forces refresh then returns current status', async () => {
    vi.mocked(services.getStatus).mockReturnValue(health)
    vi.mocked(services.refreshStatus).mockReturnValue([Promise.resolve({ status: 'up' })] as never)

    const result = await service.refreshServiceHealth()

    expect(services.refreshStatus).toHaveBeenCalledTimes(1)
    expect(services.getStatus).toHaveBeenCalledTimes(1)
    expect(result).toEqual(health)
  })
})
