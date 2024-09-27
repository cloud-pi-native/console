import { describe, expect, it } from 'vitest'
import { defaultOrNullish, disabledOrDefault, enabledOrDefaultOrNullish, objectEntries, objectKeys, objectValues, specificallyDisabled, specificallyEnabled } from './utils.ts'

const object = { test1: 1, test2: 2, 3: 'test3' }

it('should return object keys', () => {
  const keys = objectKeys(object)

  // cannot gaurantee order in keys
  expect(keys[0]).contain('3')
  expect(keys[1]).contain('test1')
  expect(keys[2]).contain('test2')
})

it('should return object entries', () => {
  const keys = objectEntries(object)

  expect(keys[0]).toEqual(['3', 'test3'])
  expect(keys[1]).toEqual(['test1', 1])
  expect(keys[2]).toEqual(['test2', 2])
})

it('should return object values', () => {
  const keys = objectValues(object)

  // cannot gaurantee order in values
  expect(keys).contain('test3')
  expect(keys).contain(1)
  expect(keys).contain(2)
})

const values = [
  '',
  'nimp',
  'enabled',
  'default',
  'disabled',
] as const
describe('test config parsing', () => {
  it('enabledOrDefaultOrNullish', () => {
    expect(enabledOrDefaultOrNullish(values[0])).toBeTruthy()
    expect(enabledOrDefaultOrNullish(values[1])).toBeFalsy()
    expect(enabledOrDefaultOrNullish(values[2])).toBeTruthy()
    expect(enabledOrDefaultOrNullish(values[3])).toBeTruthy()
    expect(enabledOrDefaultOrNullish(values[4])).toBeFalsy()
  })
  it('specificallyDisabled', () => {
    expect(specificallyDisabled(values[0])).toBeFalsy()
    expect(specificallyDisabled(values[1])).toBeFalsy()
    expect(specificallyDisabled(values[2])).toBeFalsy()
    expect(specificallyDisabled(values[3])).toBeFalsy()
    expect(specificallyDisabled(values[4])).toBeTruthy()
  })
  it('specificallyEnabled', () => {
    expect(specificallyEnabled(values[0])).toBeFalsy()
    expect(specificallyEnabled(values[1])).toBeFalsy()
    expect(specificallyEnabled(values[2])).toBeTruthy()
    expect(specificallyEnabled(values[3])).toBeFalsy()
    expect(specificallyEnabled(values[4])).toBeFalsy()
  })
  it('defaultOrNullish', () => {
    expect(defaultOrNullish(values[0])).toBeTruthy()
    expect(defaultOrNullish(values[1])).toBeFalsy()
    expect(defaultOrNullish(values[2])).toBeFalsy()
    expect(defaultOrNullish(values[3])).toBeTruthy()
    expect(defaultOrNullish(values[4])).toBeFalsy()
  })
  it('disabledOrDefault', () => {
    expect(disabledOrDefault(values[0])).toBeFalsy()
    expect(disabledOrDefault(values[1])).toBeFalsy()
    expect(disabledOrDefault(values[2])).toBeFalsy()
    expect(disabledOrDefault(values[3])).toBeTruthy()
    expect(disabledOrDefault(values[4])).toBeTruthy()
  })
})
