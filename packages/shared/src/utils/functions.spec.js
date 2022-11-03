import { describe, it, expect } from 'vitest'
import { identity } from './functions.js'

describe('Functions utils', () => {
  it('Should return identity', () => {
    expect(identity('Test')).toStrictEqual('Test')
  })
})
