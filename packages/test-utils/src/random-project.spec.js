import { describe, it, expect } from 'vitest'
import { createRandomProject } from './random-project.js'

describe('Random utils', () => {
  it('Should create a random project for tests', () => {
    expect(createRandomProject({ nbUsers: 2 })).toStrictEqual({
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
