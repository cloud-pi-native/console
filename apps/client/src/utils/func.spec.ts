import { beforeEach, describe, expect, it, vi } from 'vitest'
import { swapItems } from './func'

describe('localeParseFloat EN tests', () => {
  let localeParseFloatEN: (s: string) => number
  beforeEach(async () => {
    vi.resetModules()
    vi.resetAllMocks()
    Object.defineProperty(navigator, 'language', {
      value: 'en-EN',
      configurable: true,
    });
    ({ localeParseFloat: localeParseFloatEN } = await import('./func.js'))
  })
  it('should parse invalid float FR in locale EN', async () => {
    const result = localeParseFloatEN('4,25')
    expect(result).toBe(425)
  })

  it('should parse valid float EN in locale EN', async () => {
    const result = localeParseFloatEN('4.25')
    expect(result).toBe(4.25)
  })
})

describe('localeParseFloat FR tests', () => {
  let localeParseFloatFR: (s: string) => number
  beforeEach(async () => {
    vi.resetModules()
    vi.resetAllMocks()
    Object.defineProperty(navigator, 'language', {
      value: 'fr-FR',
      configurable: true,
    });
    ({ localeParseFloat: localeParseFloatFR } = await import('./func.js'))
  })
  it('should parse valid float FR in locale FR', async () => {
    const result = localeParseFloatFR('4,25')
    expect(result).toBe(4.25)
  })
  it('should parse valid float EN in locale FR', async () => {
    const result = localeParseFloatFR('4.25')
    expect(result).toBe(4.25)
  })
})

describe('swapItems', () => {
  it('should swap the item with its neighbour in the given direction', () => {
    expect(swapItems(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    expect(swapItems(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b'])
  })

  it('should return the same array reference when the move falls off either end', () => {
    const items = ['a', 'b', 'c']

    expect(swapItems(items, 0, -1)).toBe(items)
    expect(swapItems(items, 2, 1)).toBe(items)
  })

  it('should not mutate the input array', () => {
    const items = ['a', 'b', 'c']

    swapItems(items, 0, 1)

    expect(items).toEqual(['a', 'b', 'c'])
  })
})
