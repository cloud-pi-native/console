import { describe, it, expect } from 'vitest'
import { identity, initNewUser } from './functions.js'

describe('Functions utils', () => {
  it('Should return identity', () => {
    expect(identity('Test')).toStrictEqual('Test')
  })

  it('Should return an user', () => {
    expect(initNewUser()).toStrictEqual({
      id: undefined,
      email: undefined,
      firstName: undefined,
      lastName: undefined,
    })
  })
})
