import { describe, it, expect } from 'vitest'
import { createRandomDbSetup } from './random-project.js'

describe('Random utils', () => {
  it('Should create a random project for tests', () => {
    expect(createRandomDbSetup({ nbUsers: 2 })).toStrictEqual({
      project: {

      },
      owner: {

      },
      users: [
        {},
        {},
      ],
      repositories: [
        {},
        {},
        {},
      ],
      environments: [
        {},
        {},
        {},
        {},
      ],
      permissions: [
        {},
      ],
    })
  })
})
