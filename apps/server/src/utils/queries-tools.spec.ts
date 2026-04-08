import { describe, expect, it } from 'vitest'
import { filterObjectByKeys } from './queries-tools.js'

describe('queries-tools', () => {
  it('should return a filtered object (filterObjectByKeys)', () => {
    const initial = {
      id: 'thisIsAnId',
      name: 'alsoKeepThisKey',
      description: 'keepThisKey',
    }
    const desired = {
      name: 'alsoKeepThisKey',
      description: 'keepThisKey',
    }

    const transformed = filterObjectByKeys(initial, ['name', 'description'])

    expect(transformed).toMatchObject(desired)
  })
})
