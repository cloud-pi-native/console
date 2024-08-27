import { describe, expect, it } from 'vitest'
import { exclude } from '@cpn-console/shared'
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

  it('should return a filtered object (exclude)', () => {
    const initial = {
      id: 'thisIsAnId',
      name: 'myProjectName',
      organization: {
        name: 'myOrganization',
      },
      environment: {
        permissions: {
          password: 'secret',
          id: 'notSecret',
        },
      },
    }
    const desired = {
      id: 'thisIsAnId',
      name: 'myProjectName',
      organization: {
        name: 'myOrganization',
      },
      environment: {
        permissions: {
          id: 'notSecret',
        },
      },
    }

    const transformed = exclude(initial, ['password'])

    expect(transformed).toMatchObject(desired)
  })
})
