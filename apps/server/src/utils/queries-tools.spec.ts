import { describe, it, expect } from 'vitest'
import { replaceNestedKeys } from './queries-tools.js'

describe('queries-tools', () => {
  it('Should return an object with lowercase firrst lette on each nested keys', () => {
    const initial = {
      id: 'thisIsAnId',
      name: 'myProjectName',
      Organization: {
        name: 'myOrganization',
      },
      _Underscore: 'test',
      Environment: {
        Permissions: [],
      },
    }
    const desired = {
      id: 'thisIsAnId',
      name: 'myProjectName',
      organization: {
        name: 'myOrganization',
      },
      _Underscore: 'test',
      environment: {
        permissions: [],
      },
    }

    const transformed = replaceNestedKeys(initial)

    expect(transformed).toMatchObject(desired)
  })
})
