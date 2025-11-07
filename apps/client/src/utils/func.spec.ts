import { beforeEach, describe, expect, it, vi } from 'vitest'

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
