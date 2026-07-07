import { describe, expect, it } from 'vitest'
import { getFailedPlugins, mergePluginResults } from './plugin.utils'

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
