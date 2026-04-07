import { logger } from '@cpn-console/logger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { closeConnections } from './connect.js'
import { exitGracefully, handleExit } from './server.js'

vi.mock('fastify-keycloak-adapter', (await import('./utils/mocks.js')).mockSessionPlugin)
vi.mock('./init/db/index.js', () => ({ initDb: vi.fn() }))
vi.mock('./connect.js')

vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

vi.mock('./prepare-app.js', () => {
  const app = {
    listen: vi.fn(),
    close: vi.fn(async () => {}),
  }
  return {
    getPreparedApp: () => Promise.resolve(app),
  }
})
vi.spyOn(logger, 'warn')
vi.spyOn(logger, 'debug')
const infoSpy = vi.spyOn(logger, 'info')
const errorSpy = vi.spyOn(logger, 'error')
const fatalSpy = vi.spyOn(logger, 'fatal')

describe('server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call closeConnections without parameter', async () => {
    await exitGracefully()

    expect(closeConnections).toHaveBeenCalledTimes(1)
    expect(vi.mocked(closeConnections).mock.calls[0]).toHaveLength(0)
    expect(errorSpy).toHaveBeenCalledTimes(0)
  })

  it('should log an error', async () => {
    await exitGracefully(new Error('error'))

    expect(closeConnections).toHaveBeenCalledTimes(1)
    expect(vi.mocked(closeConnections).mock.calls[0]).toHaveLength(0)
    expect(fatalSpy).toHaveBeenCalledTimes(1)
    expect(fatalSpy.mock.calls[0]?.[0]).toBeInstanceOf(Error)
    expect(infoSpy).toHaveBeenCalledTimes(2)
  })

  it('should call process.on 4 times', () => {
    const processOn = vi.spyOn(process, 'on')

    handleExit()

    expect(processOn).toHaveBeenCalledTimes(5)
  })
})
