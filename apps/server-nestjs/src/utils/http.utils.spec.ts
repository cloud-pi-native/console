import { describe, expect, it, vi } from 'vitest'
import { getErrorHttpDetails, getErrorResponseStatus, isTransientHttpError, withTransientRetry } from './http.utils'

function errorWith(props: Record<string, unknown>): Error {
  return Object.assign(new Error('boom'), props)
}

describe('getErrorResponseStatus', () => {
  it('reads the status from an error carrying a fetch Response', () => {
    const error = errorWith({ response: new Response(null, { status: 404 }) })
    expect(getErrorResponseStatus(error)).toBe(404)
  })

  it('returns undefined without a Response or for non-errors', () => {
    expect(getErrorResponseStatus(new Error('nope'))).toBeUndefined()
    expect(getErrorResponseStatus({ response: 42 })).toBeUndefined()
    expect(getErrorResponseStatus(null)).toBeUndefined()
  })
})

describe('getErrorHttpDetails', () => {
  it('collects status, url and responseData from a direct Response', () => {
    const error = errorWith({
      response: new Response(null, { status: 502 }),
      url: 'https://backend/api',
      responseData: { message: 'upstream down' },
    })
    const details = getErrorHttpDetails(error)
    expect(details.status).toBe(502)
    expect(details.responseData).toEqual({ message: 'upstream down' })
  })

  it('ignores empty responseData', () => {
    const error = errorWith({ response: new Response(null, { status: 500 }), responseData: '' })
    expect(getErrorHttpDetails(error)).not.toHaveProperty('responseData')
  })

  it('reads status, masked url, method and description from the cause chain', () => {
    const cause = errorWith({
      request: new Request('https://gitlab/api/v4/x'),
      response: new Response(null, { status: 401 }),
      description: JSON.stringify({ secret: '//user:password@gitlab.example/x' }),
    })
    const details = getErrorHttpDetails(errorWith({ cause }))
    expect(details.status).toBe(401)
    expect(details.method).toBe('GET')
    expect(String(details.description)).not.toContain('password')
  })

  it('returns an empty record for a bare error', () => {
    expect(getErrorHttpDetails(new Error('plain'))).toEqual({})
  })

  it('falls back to masking the stringified description when it is not json', () => {
    const cause = errorWith({ description: '//alice:secret@gitlab.example/x' })
    const details = getErrorHttpDetails(errorWith({ cause }))
    expect(details.description).toBe('//MASKED:MASKED@gitlab.example/x')
  })
})

describe('isTransientHttpError', () => {
  it.each([429, 500, 502, 503, 504])('treats %i as transient', (status) => {
    expect(isTransientHttpError(errorWith({ status }))).toBe(true)
  })

  it.each([400, 401, 403, 404, 409])('does not treat %i as transient', (status) => {
    expect(isTransientHttpError(errorWith({ status }))).toBe(false)
  })

  it('reads the status from an error cause response', () => {
    const cause = errorWith({ response: new Response(null, { status: 503 }) })
    expect(isTransientHttpError(errorWith({ cause }))).toBe(true)
  })

  it('is false for errors without a status', () => {
    expect(isTransientHttpError(new Error('network gone'))).toBe(false)
  })
})

describe('withTransientRetry', () => {
  const makeNoopSleep = () => vi.fn(async () => {})

  it('retries a transient 500 and resolves on a later attempt', async () => {
    const sleep = makeNoopSleep()
    let calls = 0
    const result = await withTransientRetry(async () => {
      calls += 1
      if (calls < 3) throw errorWith({ status: 500 })
      return 'ok'
    }, { sleep })
    expect(result).toBe('ok')
    expect(calls).toBe(3)
    expect(sleep).toHaveBeenCalledTimes(2)
  })

  it('rethrows a non-transient 4xx immediately without retrying', async () => {
    const sleep = makeNoopSleep()
    const failure = errorWith({ status: 409 })
    let calls = 0
    const operation = async () => {
      calls += 1
      throw failure
    }
    await expect(withTransientRetry(operation, { sleep })).rejects.toBe(failure)
    expect(calls).toBe(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('rethrows the last error after exhausting the attempts', async () => {
    const sleep = makeNoopSleep()
    const failure = errorWith({ status: 503 })
    let calls = 0
    const operation = async () => {
      calls += 1
      throw failure
    }
    await expect(withTransientRetry(operation, { attempts: 3, sleep })).rejects.toBe(failure)
    expect(calls).toBe(3)
    expect(sleep).toHaveBeenCalledTimes(2)
  })

  it('treats a 429 as transient', async () => {
    const sleep = makeNoopSleep()
    let calls = 0
    const result = await withTransientRetry(async () => {
      calls += 1
      if (calls === 1) throw errorWith({ status: 429 })
      return 'ok'
    }, { sleep })
    expect(result).toBe('ok')
    expect(calls).toBe(2)
  })
})
