import { describe, expect, it } from 'vitest'
import { calcProjectNameMaxLength, exclude, identity, removeTrailingSlash, shallowEqual, shallowMatch } from './functions.js'

describe('function utils: identity', () => {
  it('should return identity', () => {
    expect(identity('Test')).toStrictEqual('Test')
  })
})

describe('function utils: exclude', () => {
  it('should exclude keys', () => {
    const emptyInput = {}
    const simpleInput = {
      hello: 'world',
      foo: 'bar',
    }
    const simpleExpectedInput = {
      foo: 'bar',
    }
    const complexInput = {
      empty: emptyInput,
      simple: simpleInput,
      array: [emptyInput, simpleInput, simpleInput, emptyInput],
      number: 1,
    }
    const complexExpectedOutput = {
      empty: emptyInput,
      simple: simpleExpectedInput,
      array: [emptyInput, simpleExpectedInput, simpleExpectedInput, emptyInput],
      number: 1,
    }

    expect(exclude(emptyInput, ['absentKey'])).toStrictEqual({})
    expect(exclude(simpleInput, ['hello'])).toStrictEqual(simpleExpectedInput)
    expect(exclude(complexInput, ['hello'])).toStrictEqual(complexExpectedOutput)
  })

  it('should not mutate input', () => {
    const simpleInput = {
      hello: 'world',
      foo: 'bar',
    }
    exclude(simpleInput, ['hello'])
    expect(simpleInput).toStrictEqual(simpleInput)
  })
})

describe('function utils: calcProjectNameMaxLength', () => {
  it('should return max length', () => {
    expect(calcProjectNameMaxLength()).toStrictEqual(50)
  })
})

describe('function utils: removeTrailingSlash', () => {
  it('should return string without ending slash', () => {
    expect(removeTrailingSlash('mtest')).toStrictEqual('mtest')
    expect(removeTrailingSlash('mtest/')).toStrictEqual('mtest')
  })
})

describe('function utils: shallowEqual', () => {
  it('should return false if value differs', () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toEqual(false)
  })
  it('should return false if missing key', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1 })).toEqual(false)
  })
  it('should return true if equal', () => {
    expect(shallowEqual({ a: 1 }, { a: 1 })).toEqual(true)
  })
  it('should ignore undefined values in object1', () => {
    expect(shallowEqual({ a: 1, b: undefined }, { a: 1 })).toEqual(true)
  })
  it('should ignore undefined values in object2', () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: undefined })).toEqual(true)
  })
  it('should return true even if keys are in different order', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toEqual(true)
  })
  it('should treat empty objects as equal', () => {
    expect(shallowEqual({}, {})).toEqual(true)
  })
  it('should treat objects with only undefined keys as equal', () => {
    expect(shallowEqual({ a: undefined }, { b: undefined })).toEqual(true)
  })
})

describe('function utils: shallowMatch', () => {
  it('should return false if key is not equal', () => {
    expect(shallowMatch({ a: 1 }, { a: 2 })).toEqual(false)
  })
  it('should return false if missing key', () => {
    expect(shallowMatch({ a: 1, b: 2 }, { a: 1 })).toEqual(false)
  })
  it('should return true if is equal', () => {
    expect(shallowMatch({ a: 1 }, { a: 1 })).toEqual(true)
  })
})
