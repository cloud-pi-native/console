import { vi, describe, it, expect, beforeEach } from 'vitest'
import fp from 'fastify-plugin'
import app from './app.js'
import { startServer } from './server.js'

vi.mock('./app.js')
vi.mock('./utils/logger.js')
vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))

describe('Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Should start server', async () => {
    await startServer().catch(err => console.warn(err))

    expect(app.listen.mock.calls).toHaveLength(1)
  })
})
