import { apiPrefix } from '@cpn-console/shared'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import app from './app.js'
import { getRandomRequestor, setRequestor } from './utils/mocks.js'

vi.mock('fastify-keycloak-adapter', (await import('./utils/mocks.js')).mockSessionPlugin)

describe('app', () => {
  beforeEach(() => {
    setRequestor(getRandomRequestor())
  })
  afterAll(async () => {
    await app.close()
  })

  it('should respond with the version', async () => {
    const response = await app.inject()
      .get(`${apiPrefix}/version`)
    expect(JSON.parse(response.body).version).toBe('dev')
  })

  it('should respond with the healthz', async () => {
    const response = await app.inject()
      .get(`${apiPrefix}/healthz`)
    expect(JSON.parse(response.body).status).toBe('OK')
  })
  it('should respond 404 on unknown route', async () => {
    const response = await app.inject()
      .get(`${apiPrefix}/miss`)
    expect(response.statusCode).toBe(404)
  })
})
