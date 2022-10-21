import app from './app.js'
import { vi } from 'vitest'
import { startServer, handleExit, exitGracefuly } from './server.js'
import { getConnection, closeConnections } from './connect.js'
// import { initDb } from '../dev-setup/init-db.js'

vi.mock('./app.js')
vi.mock('./connect.js')
// vi.mock('./connect.js', () => ({ getConnection: vi.fn(), closeConnections: vi.fn() }))
vi.mock('./utils/logger.js')
// vi.mock('../dev-setup/init-db.js')

describe('Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Should call process.on 4 times', () => {
    const processOn = vi.spyOn(process, 'on')

    handleExit()

    expect(processOn.mock.calls).toHaveLength(4)
  })

  it('Should getConnection', async () => {
    await startServer().catch(error => console.warn(error))

    expect(getConnection.mock.calls).toHaveLength(1)
    // expect(initDb.mock.calls).toHaveLength(1)
    expect(app.listen.mock.calls).toHaveLength(1)
  })

  it('Should throw an error', async () => {
    const error = new Error('This is OK!')
    getConnection.mockReturnValueOnce(Promise.reject(error))

    let response
    try {
      await startServer()
    } catch (err) {
      response = err
    }

    expect(getConnection.mock.calls).toHaveLength(1)
    expect(app.listen.mock.calls).toHaveLength(0)
    expect(response).toMatchObject(error)
  })

  it('Should call closeConnections without parameter', async () => {
    process.exit = vi.fn()

    await exitGracefuly()

    expect(closeConnections.mock.calls).toHaveLength(1)
    expect(closeConnections.mock.calls[0]).toHaveLength(0)
    expect(app.log.error.mock.calls).toHaveLength(2)
  })

  it('Should log an error', async () => {
    process.exit = vi.fn()

    await exitGracefuly(new Error())

    expect(closeConnections.mock.calls).toHaveLength(1)
    expect(closeConnections.mock.calls[0]).toHaveLength(0)
    expect(app.log.error.mock.calls).toHaveLength(3)
    expect(app.log.error.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})
