import { vi, describe, it, expect, beforeEach } from 'vitest'
import app from './__mocks__/app.js'
import { startServer, handleExit, exitGracefully } from './server.js'
import { getConnection, closeConnections } from './connect.js'
import { initDb } from './init/db/index.js'

vi.mock('./app.js')
vi.mock('./connect.js')
vi.mock('./utils/logger.js')
vi.mock('./init/db/index.js', () => ({ initDb: vi.fn() }))

describe.skip('Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Should call process.on 4 times', () => {
    const processOn = vi.spyOn(process, 'on')

    handleExit()

    expect(processOn.mock.calls).toHaveLength(4)
  })

  it('Should getConnection', async () => {
    await startServer().catch(err => console.warn(err))

    expect(getConnection.mock.calls).toHaveLength(1)
    expect(initDb.mock.calls).toHaveLength(1)
    expect(app.listen.mock.calls).toHaveLength(1)
  })

  it('Should throw an error on connection to DB', async () => {
    const error = new Error('This is OK!')
    getConnection.mockRejectedValueOnce(error)

    let response
    await startServer().catch(err => { response = err })

    expect(getConnection.mock.calls).toHaveLength(1)
    expect(app.listen.mock.calls).toHaveLength(0)
    expect(response).toMatchObject(error)
  })

  it('Should throw an error on initDb import if module is not found', async () => {
    const error = new Error('Failed to load')
    initDb.mockRejectedValueOnce(error)

    await startServer()

    expect(initDb.mock.calls).toHaveLength(1)
    expect(app.log.info.mock.calls).toHaveLength(3)
  })

  it('Should throw an error on initDb import', async () => {
    const error = new Error('This is OK!')
    initDb.mockRejectedValueOnce(error)

    let response
    try {
      await startServer()
    } catch (err) {
      response = err
    }

    expect(initDb.mock.calls).toHaveLength(1)
    expect(app.log.info.mock.calls).toHaveLength(2)
    expect(response).toMatchObject(error)
  })

  it('Should call closeConnections without parameter', async () => {
    await exitGracefully()

    expect(closeConnections.mock.calls).toHaveLength(1)
    expect(closeConnections.mock.calls[0]).toHaveLength(0)
    expect(app.log.error.mock.calls).toHaveLength(0)
  })

  it('Should log an error', async () => {
    await exitGracefully(new Error())

    expect(closeConnections.mock.calls).toHaveLength(1)
    expect(closeConnections.mock.calls[0]).toHaveLength(0)
    expect(app.log.error.mock.calls).toHaveLength(1)
    expect(app.log.error.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})
