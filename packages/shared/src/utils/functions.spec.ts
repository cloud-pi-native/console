import { describe, it, expect } from 'vitest'
import { calcProjectNameMaxLength, exclude, identity, removeTrailingSlash } from './functions.js'

describe('Function utils: identity', () => {
  it('Should return identity', () => {
    expect(identity('Test')).toStrictEqual('Test')
  })
})

describe('Function utils: exclude', () => {
  it('Should exclude keys', () => {
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

  it('Should not mutate input', () => {
    const simpleInput = {
      hello: 'world',
      foo: 'bar',
    }
    exclude(simpleInput, ['hello'])
    expect(simpleInput).toStrictEqual(simpleInput)
  })
})

describe('Function utils: calcProjectNameMaxLength', () => {
  it('Should return max length', () => {
    expect(calcProjectNameMaxLength('mtest')).toStrictEqual(45)
    expect(calcProjectNameMaxLength('')).toStrictEqual(50)
  })
})

describe('Function utils: removeTrailingSlash', () => {
  it('Should return string without ending slash', () => {
    expect(removeTrailingSlash('mtest')).toStrictEqual('mtest')
    expect(removeTrailingSlash('mtest/')).toStrictEqual('mtest')
  })
})
