import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import { CreateAdminTokenBodySchema } from './index.js'

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
