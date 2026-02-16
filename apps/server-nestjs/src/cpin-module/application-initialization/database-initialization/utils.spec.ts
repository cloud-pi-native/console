import { describe, expect, it, vi } from 'vitest'

import prisma from '../../__mocks__/prisma'
import { modelKeys, moveBefore, resourceListToDict } from './utils'

vi.mock('fs', () => ({ writeFileSync: vi.fn() }))
for (const modelKey of modelKeys) {
  prisma[modelKey].findMany.mockResolvedValue([])
}

describe('test moveBefore', () => {
  it('should be moved', () => {
    const arr = ['a', 'b', 'c']
    const arrSorted = moveBefore(arr, 'c', 'b')
    expect(arrSorted).toEqual(['a', 'c', 'b'])

    const arrSorted2 = moveBefore(arr, 'c', 'a')
    expect(arrSorted2).toEqual(['c', 'a', 'b'])
  })
  it('should not be moved', () => {
    const arr = ['a', 'b', 'c']
    const arrSorted = moveBefore(arr, 'b', 'c')
    expect(arrSorted).toEqual(false)

    const arrSorted2 = moveBefore(arr, 'a', 'c')
    expect(arrSorted2).toEqual(false)

    const arrSorted3 = moveBefore(arr, 'c', 'c')
    expect(arrSorted3).toEqual(false)
  })
})

it('test resourceListToDict (by name)', () => {
  const list = [
    { name: 'a', value: 1 },
    { name: 'b', value: 2 },
    { name: 'c', value: 3 },
  ]
  const dict = resourceListToDict(list)
  expect(dict).toEqual({
    a: { name: 'a', value: 1 },
    b: { name: 'b', value: 2 },
    c: { name: 'c', value: 3 },
  })
})

it('stringify bigint', () => {
  const list = { name: 'a', value: 1n }

  const dict = JSON.stringify(list)

  expect(dict).toEqual('{"name":"a","value":"1n"}')
})
