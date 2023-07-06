import { vi, describe, it, expect } from 'vitest'
import fp from 'fastify-plugin'
import app from './app.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))

describe.skip('app', () => {
  it('should respond with the version', async () => {
    const response = await app.inject()
      .get('/version')
      .end()
    expect(response.body).toBe('dev')
  })
})
