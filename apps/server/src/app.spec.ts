import { vi, afterAll, describe, it, expect } from 'vitest'
import app from './app.js'

vi.mock('fastify-keycloak-adapter', (await import('./utils/mocks.js')).mockSessionPlugin)

describe('app', () => {
  afterAll(async () => {
    await app.close()
  })

  it('should respond with the version', async () => {
    const response = await app.inject()
      .get('/api/v1/version')
    expect(JSON.parse(response.body).version).toBe('dev')
  })

  it('should respond with the healthz', async () => {
    const response = await app.inject()
      .get('/api/v1/healthz')
    expect(JSON.parse(response.body).status).toBe('OK')
  })
})
