import { describe, expect, it } from 'vitest'
import { calcProjectNameMaxLength, exclude, identity, removeTrailingSlash } from './functions.js'

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
    expect(calcProjectNameMaxLength('mtest')).toStrictEqual(45)
    expect(calcProjectNameMaxLength('')).toStrictEqual(50)
  })
})

describe('function utils: removeTrailingSlash', () => {
  it('should return string without ending slash', () => {
    expect(removeTrailingSlash('mtest')).toStrictEqual('mtest')
    expect(removeTrailingSlash('mtest/')).toStrictEqual('mtest')
  })
})
