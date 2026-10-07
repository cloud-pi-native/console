import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import { endOfToday, tomorrowNoon } from '../utils/date.js'
import { CreateAdminTokenBodySchema, CreatePersonalAccessTokenBodySchema } from './index.js'

describe('token body schemas', () => {
  it('accepts an admin token body with nullable expiration', () => {
    const result = CreateAdminTokenBodySchema.safeParse({ name: faker.string.alpha({ length: 8, casing: 'lower' }), permissions: '4', expirationDate: null })
    expect(result.success).toBe(true)
  })

  it('rejects an admin token expiration before tomorrow', () => {
    const result = CreateAdminTokenBodySchema.safeParse({ name: faker.string.alpha({ length: 8, casing: 'lower' }), permissions: '4', expirationDate: new Date().toISOString() })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues[0].message).toBe('Date d\'expiration trop courte')
  })
})

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
