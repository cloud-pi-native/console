import { describe, it, expect } from 'vitest'
import { createRandomDbSetup } from 'test-utils'

describe('Random utils', () => {
  it('Should create a random project for tests', () => {
    expect(createRandomDbSetup({ nbUsers: 3, nbRepo: 1, envs: ['dev', 'prod'] })).toEqual(
      expect.objectContaining({
        project: expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          organization: expect.any(String),
          status: expect.any(String),
          locked: expect.any(Boolean),
          users: expect.arrayContaining([
            {
              id: expect.any(String),
              role: expect.any(String),
            },
            {
              id: expect.any(String),
              role: expect.any(String),
            },
            {
              id: expect.any(String),
              role: expect.any(String),
            }]),
          repositories: expect.any(Array),
          environments: expect.arrayContaining([
            {
              id: expect.any(String),
              name: 'dev',
              projectId: expect.any(String),
              status: expect.any(String),
              permissions: expect.any(Array),
            },
            {
              id: expect.any(String),
              name: 'prod',
              projectId: expect.any(String),
              status: expect.any(String),
              permissions: expect.any(Array),
            },
          ]),
        }),
        users: expect.arrayContaining([
          {
            id: expect.any(String),
            email: expect.any(String),
            firstName: expect.any(String),
            lastName: expect.any(String),
          },
          {
            id: expect.any(String),
            email: expect.any(String),
            firstName: expect.any(String),
            lastName: expect.any(String),
          },
          {
            id: expect.any(String),
            email: expect.any(String),
            firstName: expect.any(String),
            lastName: expect.any(String),
          }]),
      }),
    )
  })
})
