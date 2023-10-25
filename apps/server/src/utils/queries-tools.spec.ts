import { describe, it, expect } from 'vitest'
import { filterObjectByKeys } from './queries-tools.js'
import { exclude } from '@dso-console/shared'

describe('queries-tools', () => {
  it('Should return a filtered object', () => {
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

  it('Should return a filtered object', () => {
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
