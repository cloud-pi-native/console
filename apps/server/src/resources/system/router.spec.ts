import { vi, describe, it, expect } from 'vitest'
import { apiPrefix } from '@cpn-console/shared'
import app from '../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)

describe('System - router', () => {
  it('Should send application version', async () => {
    const response = await app.inject()
      .get(`${apiPrefix}/version`)
      .end()

    expect(response.statusCode).toBe(200)
    expect(response.json()).toStrictEqual({ version: process.env.APP_VERSION || 'dev' })
  })

  it('Should send application health with status OK', async () => {
    const response = await app.inject()
      .get(`${apiPrefix}/healthz`)
      .end()

    expect(response.statusCode).toBe(200)
    expect(response.json()).toStrictEqual({ status: 'OK' })
  })
})
