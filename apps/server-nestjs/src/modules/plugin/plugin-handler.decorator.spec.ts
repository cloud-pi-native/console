import { describe, expect, it } from 'vitest'
import { PluginHandler } from './plugin-handler.decorator'

class FakeService {
  @PluginHandler('gitlab')
  async succeeds() {
    // no explicit return: decorator falls back to the default message
  }

  @PluginHandler('gitlab')
  async succeedsWithMessage() {
    return 'Everything synced'
  }

  @PluginHandler('gitlab')
  async fails(): Promise<void> {
    throw new Error('GitLab unreachable')
  }

  @PluginHandler('gitlab')
  async failsWithNonError(): Promise<void> {
    throw 'boom' // eslint-disable-line no-throw-literal
  }

  @PluginHandler('nexus')
  async echoes(value: string) {
    return value
  }
}

describe('pluginHandler decorator', () => {
  const service = new FakeService()

  it('should wrap a successful handler into an OK result with the default message', async () => {
    await expect(service.succeeds()).resolves.toEqual({
      gitlab: {
        status: 'OK',
        message: 'Up to date',
        executionTime: expect.any(Number),
      },
    })
  })

  it('should use the string returned by the handler as message', async () => {
    await expect(service.succeedsWithMessage()).resolves.toEqual({
      gitlab: expect.objectContaining({ status: 'OK', message: 'Everything synced' }),
    })
  })

  it('should wrap a throwing handler into a KO result instead of rejecting', async () => {
    await expect(service.fails()).resolves.toEqual({
      gitlab: {
        status: 'KO',
        message: 'GitLab unreachable',
        executionTime: expect.any(Number),
        error: new Error('GitLab unreachable'),
      },
    })
  })

  it('should report a fallback message for non-Error throws', async () => {
    await expect(service.failsWithNonError()).resolves.toEqual({
      gitlab: expect.objectContaining({ status: 'KO', message: 'Erreur inconnue', error: 'boom' }),
    })
  })

  it('should forward the handler arguments and report under the given plugin name', async () => {
    await expect(service.echoes('custom message')).resolves.toEqual({
      nexus: expect.objectContaining({ status: 'OK', message: 'custom message' }),
    })
  })
})
