import type { ServiceStatus } from '@cpn-console/hooks'
import { MonitorStatus, serviceContract } from '@cpn-console/shared'
import { describe, expect, it, vi } from 'vitest'
import app from '../../app.js'
import * as business from './business.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
const businessMock = vi.spyOn(business, 'checkServicesHealth')

describe('test serviceContract', () => {
  it('should return services', async () => {
    const services: ServiceStatus[] = [{ interval: 1, lastUpdateTimestamp: 1, message: 'OK', name: 'A service', status: MonitorStatus.OK }]

    businessMock.mockResolvedValue(services)
    const response = await app.inject()
      .get(serviceContract.getServiceHealth.path)
      .end()

    expect(response.json()).toStrictEqual(services)
    expect(response.statusCode).toEqual(200)
  })
})
