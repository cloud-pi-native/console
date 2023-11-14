import { afterAll, describe, it, expect } from 'vitest'
import app from './__mocks__/app.js'

describe('app', () => {
  afterAll(async () => {
    await app.close()
  })

  it('should respond with the version', async () => {
    const response = await app.inject()
      .get('/api/v1/version')
    expect(response.body).toBe('dev')
  })

  it('should respond with the healthz', async () => {
    const response = await app.inject()
      .get('/api/v1/healthz')
    expect(response.body).toBe('OK')
  })
})
