import { describe, expect, it } from 'vitest'
import { getErrorHttpDetails, getErrorResponseStatus } from './http.utils'

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
