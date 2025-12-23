import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPreparedApp } from './prepare-app'
import { getConnection } from './connect'
import { initDb } from './init/db/index'
import app, { logger } from './app'

vi.mock('fastify-keycloak-adapter', (await import('./utils/mocks')).mockSessionPlugin)
vi.mock('./connect')
vi.mock('./index')
vi.mock('./utils/logger')
vi.mock('./init/db/index', () => ({ initDb: vi.fn() }))

vi.spyOn(app, 'listen')
vi.spyOn(logger, 'info')
vi.spyOn(logger, 'warn')
vi.spyOn(logger, 'error')
vi.spyOn(logger, 'debug')

describe('server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should getConnection', async () => {
    // const port = Math.round(Math.random() * 10000) + 1024
    await getPreparedApp().catch(err => console.warn(err))

    expect(getConnection).toHaveBeenCalledTimes(1)
    expect(initDb.mock.calls).toHaveLength(1)
  })

  it('should throw an error on connection to DB', async () => {
    const error = new Error('This is OK!')
    getConnection.mockRejectedValueOnce(error)

    let response
    await getPreparedApp()
      .catch((err) => { response = err })

    expect(getConnection.mock.calls).toHaveLength(1)
    expect(app.listen.mock.calls).toHaveLength(0)
    expect(response).toMatchObject(error)
  })

  it('should throw an error on initDb import if module is not found', async () => {
    const error = new Error('Failed to load')
    initDb.mockRejectedValueOnce(error)

    await getPreparedApp()

    expect(initDb.mock.calls).toHaveLength(1)
    expect(logger.info.mock.calls).toHaveLength(3)
  })

  it('should throw an error on initDb import', async () => {
    const error = new Error('This is OK!')
    initDb.mockRejectedValueOnce(error)

    let response
    try {
      await getPreparedApp()
    } catch (err) {
      response = err
    }

    expect(initDb.mock.calls).toHaveLength(1)
    expect(logger.info.mock.calls).toHaveLength(2)
    expect(response).toMatchObject(error)
  })
})
