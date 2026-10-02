import { describe, expect, it } from 'vitest'
import { endOfToday, tomorrowNoon } from '../utils/date.js'
import { CreatePersonalAccessTokenBodySchema } from './token.js'

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
      expirationDate: endOfToday().toISOString(),
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
