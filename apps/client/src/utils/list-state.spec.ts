import { describe, expect, it } from 'vitest'
import { collectionViewState, toError } from './list-state.js'

describe('collectionViewState', () => {
  it('reports loading before the first response, even when the collection is empty', () => {
    expect(collectionViewState({ loading: true, count: 0 })).toBe('loading')
  })

  it('reports error before empty so a failed request is never shown as "no data"', () => {
    expect(collectionViewState({ loading: false, error: new Error('réseau'), count: 0 })).toBe('error')
  })

  it('reports empty only after a successful, empty response', () => {
    expect(collectionViewState({ loading: false, count: 0 })).toBe('empty')
  })

  it('reports ready when the collection has items', () => {
    expect(collectionViewState({ loading: false, count: 3 })).toBe('ready')
  })
})

describe('toError', () => {
  it('passes Error values through untouched', () => {
    const error = new Error('réseau')
    expect(toError(error)).toBe(error)
  })

  it('wraps non-Error throwables into an Error', () => {
    expect(toError('boom')).toBeInstanceOf(Error)
    expect(toError(undefined).message).not.toBe('')
  })
})
