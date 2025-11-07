import { beforeEach, describe, expect, it, vi } from 'vitest'
import { localeParseFloat } from './func.js'

describe('localeParseFloat tests', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should parse invalid float FR in locale EN', async () => {
    const result = localeParseFloat('4,25')
    expect(result).toBe(425)
  })

  it('should parse valid float EN in locale EN', async () => {
    const result = localeParseFloat('4.25')
    expect(result).toBe(4.25)
  })
})
