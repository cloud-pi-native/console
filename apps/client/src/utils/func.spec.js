import { identity } from '@/utils/func.js'

describe('func', () => {
  it('Should return identity', () => {
    expect(identity('Test')).toStrictEqual('Test')
  })
})
