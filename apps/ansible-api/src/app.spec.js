import { vi, describe, it, expect } from 'vitest'
import fp from 'fastify-plugin'
import app, { apiPrefix } from './app.js'

const version = process.env.npm_package_version

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))

describe('app', () => {
  it('should respond with the version', async () => {
    const response = await app.inject()
      .get(`${apiPrefix}/version`)
      .end()
    expect(response.body).toBe(version)
  })
})
