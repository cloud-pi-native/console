import { vi, describe, it, expect } from 'vitest'
import fp from 'fastify-plugin'
import app from './app.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))

describe('app', () => {
  it('should respond with the version', async () => {
    const response = await app.inject()
      .get('/api/v1/version')
      .end()
    expect(response.body).toBe('dev')
  })

  it('should respond with the healthz', async () => {
    const response = await app.inject()
      .get('/api/v1/healthz')
      .end()
    expect(response.body).toBe('OK')
  })
})
