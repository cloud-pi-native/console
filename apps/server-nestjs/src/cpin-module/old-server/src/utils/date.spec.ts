import { describe, expect, it } from 'vitest'
import { getJSDateFromUtcIso } from './date'

describe('date-util', () => {
  it('should return a native Date object', () => {
    const date = '2022-10-11'

    const received = getJSDateFromUtcIso(date)

    expect(received.getMonth()).toBe(9)
    expect(received.getFullYear()).toBe(2022)
    expect(received.getDate()).toBeGreaterThan(10)
    expect(received.getDate()).toBeLessThan(12)
  })
})
