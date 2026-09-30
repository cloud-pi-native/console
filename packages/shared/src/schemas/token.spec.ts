import { describe, expect, it } from 'vitest'
import { CreatePersonalAccessTokenBodySchema } from './token.js'

function tomorrowNoon() {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + 1)
  date.setUTCHours(12, 0, 0, 0)
  return date
}

describe('createPersonalAccessTokenBodySchema', () => {
  it('rejects an invalid expiration date', () => {
    const result = CreatePersonalAccessTokenBodySchema.safeParse({
      name: 'my-token',
      expirationDate: 'not-a-date',
    })

    expect(result.success).toBe(false)
  })

  it('rejects an expiration date before tomorrow', () => {
    const result = CreatePersonalAccessTokenBodySchema.safeParse({
      name: 'my-token',
      expirationDate: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    })

    expect(result.success).toBe(false)
  })

  it('accepts an expiration date tomorrow', () => {
    const result = CreatePersonalAccessTokenBodySchema.safeParse({
      name: 'my-token',
      expirationDate: tomorrowNoon().toISOString(),
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.expirationDate).toBeInstanceOf(Date)
    }
  })
})
