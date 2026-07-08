import type { PluginResults } from '../plugin/plugin.utils'
import { describe, expect, it } from 'vitest'
import { formatEventLogData, isPluginResults, serializeError } from './app-events.utils'

describe('isPluginResults', () => {
  it('should accept an object produced by a capturePluginResult handler', () => {
    expect(isPluginResults({ gitlab: { status: 'OK', message: 'Up to date', executionTime: 10 } })).toBe(true)
    expect(isPluginResults({ argocd: { status: 'KO', message: 'boom', executionTime: 10, error: new Error('boom') } })).toBe(true)
  })

  it('should reject non-result responses', () => {
    expect(isPluginResults(undefined)).toBe(false)
    expect(isPluginResults(null)).toBe(false)
    expect(isPluginResults('ok')).toBe(false)
    expect(isPluginResults({})).toBe(false)
    expect(isPluginResults({ gitlab: { foo: 'bar' } })).toBe(false)
    expect(isPluginResults({ gitlab: { status: 'MAYBE' } })).toBe(false)
  })
})

describe('serializeError', () => {
  it('should serialize an Error with name, message and stack', () => {
    const parsed = JSON.parse(serializeError(new Error('boom')))
    expect(parsed).toEqual({ name: 'Error', message: 'boom', stack: expect.any(String) })
  })

  it('should serialize non-Error values', () => {
    expect(serializeError({ code: 42 })).toBe('{"code":42}')
    expect(serializeError('boom')).toBe('"boom"')
  })
})

describe('formatEventLogData', () => {
  const args = { id: 'project-1', slug: 'project-1' }

  it('should format results in the LogSchema shape', () => {
    const results: PluginResults = {
      gitlab: { status: 'OK', message: 'Up to date', executionTime: 12.4 },
      argocd: { status: 'KO', message: 'Sync failed', executionTime: 100.9, error: new Error('Sync failed') },
    }

    expect(formatEventLogData(args, results, 120.6)).toEqual({
      args,
      failed: ['argocd'],
      results: {
        gitlab: {
          status: { result: 'OK', message: 'Up to date' },
          executionTime: { main: 12 },
        },
        argocd: {
          status: { result: 'KO', message: 'Sync failed' },
          executionTime: { main: 101 },
          error: expect.stringContaining('"message":"Sync failed"'),
        },
      },
      totalExecutionTime: 121,
      messageResume: 'Errors:\nargocd: Sync failed;',
    })
  })

  it('should produce an empty failed list and a success resume when everything is OK', () => {
    const results: PluginResults = {
      gitlab: { status: 'OK', message: 'Up to date', executionTime: 10 },
    }

    expect(formatEventLogData(args, results, 10)).toEqual(expect.objectContaining({
      failed: [],
      messageResume: 'Success',
    }))
  })

  it('should handle events without any listener', () => {
    expect(formatEventLogData(args, {}, 1)).toEqual({
      args,
      failed: [],
      results: {},
      totalExecutionTime: 1,
      messageResume: 'Success',
    })
  })
})
