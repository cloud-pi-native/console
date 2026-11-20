import { describe, expect, it } from 'vitest'
import { capturePluginResult, getFailedPlugins, mergePluginResults } from './plugin.utils'

describe('capturePluginResult', () => {
  it('should resolve a successful task into an OK result with the default message, keyed under the plugin name', async () => {
    await expect(capturePluginResult('gitlab', async () => {})).resolves.toEqual({
      gitlab: {
        status: 'OK',
        message: 'Up to date',
        executionTime: expect.any(Number),
      },
    })
  })

  it('should use the string returned by the task as message', async () => {
    await expect(capturePluginResult('gitlab', async () => 'Everything synced')).resolves.toEqual({
      gitlab: expect.objectContaining({ status: 'OK', message: 'Everything synced' }),
    })
  })

  it('should resolve a throwing task into a KO result instead of rejecting', async () => {
    const task = async () => {
      throw new Error('GitLab unreachable')
    }
    await expect(capturePluginResult('gitlab', task)).resolves.toEqual({
      gitlab: {
        status: 'KO',
        message: 'GitLab unreachable',
        executionTime: expect.any(Number),
        error: new Error('GitLab unreachable'),
      },
    })
  })

  it('should report a fallback message for non-Error throws', async () => {
    const task = async () => {
      throw 'boom' // eslint-disable-line no-throw-literal
    }
    await expect(capturePluginResult('gitlab', task)).resolves.toEqual({
      gitlab: expect.objectContaining({ status: 'KO', message: 'Erreur inconnue', error: 'boom' }),
    })
  })

  it('should report under the given plugin name', async () => {
    await expect(capturePluginResult('nexus', async () => 'custom message')).resolves.toEqual({
      nexus: expect.objectContaining({ status: 'OK', message: 'custom message' }),
    })
  })
})

describe('mergePluginResults', () => {
  it('should return empty object when given empty array', () => {
    expect(mergePluginResults([])).toEqual({})
  })

  it('should return single result as-is', () => {
    const result = [{ argocd: { status: 'OK' as const, message: 'Up to date', executionTime: 10 } }]
    expect(mergePluginResults(result)).toEqual(result[0])
  })

  it('should merge multiple results into one', () => {
    const results = [
      { argocd: { status: 'OK' as const, message: 'Up to date', executionTime: 10 } },
      { gitlab: { status: 'OK' as const, message: 'Synced', executionTime: 20 } },
    ]
    expect(mergePluginResults(results)).toEqual({
      argocd: { status: 'OK', message: 'Up to date', executionTime: 10 },
      gitlab: { status: 'OK', message: 'Synced', executionTime: 20 },
    })
  })

  it('should have later entries overwrite earlier ones for the same plugin', () => {
    const error = new Error('sync error')
    const results = [
      { argocd: { status: 'OK' as const, message: 'Up to date', executionTime: 10 } },
      { argocd: { status: 'KO' as const, message: 'Failed', executionTime: 20, error } },
    ]
    expect(mergePluginResults(results)).toEqual({
      argocd: { status: 'KO', message: 'Failed', executionTime: 20, error },
    })
  })
})

describe('getFailedPlugins', () => {
  it('should return empty array when all plugins are OK', () => {
    const results = {
      argocd: { status: 'OK' as const, message: 'Up to date', executionTime: 10 },
      gitlab: { status: 'OK' as const, message: 'Synced', executionTime: 20 },
    }
    expect(getFailedPlugins(results)).toEqual([])
  })

  it('should return names of KO plugins', () => {
    const error = new Error('sync error')
    const results = {
      argocd: { status: 'KO' as const, message: 'Failed', executionTime: 10, error },
      gitlab: { status: 'OK' as const, message: 'Synced', executionTime: 20 },
    }
    expect(getFailedPlugins(results)).toEqual(['argocd'])
  })

  it('should return all plugins when all fail', () => {
    const error = new Error('error')
    const results = {
      argocd: { status: 'KO' as const, message: 'Failed', executionTime: 10, error },
      gitlab: { status: 'KO' as const, message: 'Failed', executionTime: 20, error },
    }
    const failed = getFailedPlugins(results)
    expect(failed).toHaveLength(2)
    expect(failed).toContain('argocd')
    expect(failed).toContain('gitlab')
  })

  it('should return empty array for empty result', () => {
    expect(getFailedPlugins({})).toEqual([])
  })
})
