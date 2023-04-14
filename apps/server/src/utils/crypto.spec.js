import { describe, it, expect } from 'vitest'
import { generateRandomPassword } from './crypto'

describe('crypto', () => {
  it('Should generate a random password', async () => {
    const defaultLength = 24
    const length = 15

    const password1 = generateRandomPassword()
    const password2 = generateRandomPassword(length)

    expect(password1).toHaveLength(defaultLength)
    expect(password2).toHaveLength(length)
  })
})
