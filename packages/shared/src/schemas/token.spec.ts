import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import { CreatePersonalAccessTokenBodySchema } from './index.js'

describe('token body schemas', () => {
  it('accepts a personal access token body with future expiration', () => {
    const result = CreatePersonalAccessTokenBodySchema.safeParse({ name: faker.string.alpha({ length: 8, casing: 'lower' }), expirationDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString() })
    expect(result.success).toBe(true)
  })

  it('rejects a non-parseable personal access token expiration', () => {
    const result = CreatePersonalAccessTokenBodySchema.safeParse({ name: faker.string.alpha({ length: 8, casing: 'lower' }), expirationDate: 'not-a-date' })
    expect(result.success).toBe(false)
  })

  it('rejects a personal access token expiration before tomorrow', () => {
    const result = CreatePersonalAccessTokenBodySchema.safeParse({ name: faker.string.alpha({ length: 8, casing: 'lower' }), expirationDate: new Date().toISOString() })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues[0].message).toBe('Date d\'expiration trop courte')
  })
})
