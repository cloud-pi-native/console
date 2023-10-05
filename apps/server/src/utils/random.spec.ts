import { describe, it, expect } from 'vitest'
import { createRandomDbSetup } from '@dso-console/test-utils'

describe('Random utils', () => {
  it('Should create a random project for tests', () => {
    const db = createRandomDbSetup({ nbUsers: 3, nbRepo: 1, envs: ['dev', 'prod'] })
    expect(db).toEqual(
      expect.objectContaining({
        dsoEnvironments: expect.arrayContaining([
          {
            id: expect.any(String),
            name: expect.any(String),
          },
          {
            id: expect.any(String),
            name: expect.any(String),
          },
          {
            id: expect.any(String),
            name: expect.any(String),
          },
          {
            id: expect.any(String),
            name: expect.any(String),
          },
        ]),
        project: expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          organizationId: expect.any(String),
          organization: expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            source: expect.any(String),
            label: expect.any(String),
            active: expect.any(Boolean),
          }),
          status: expect.any(String),
          locked: expect.any(Boolean),
          roles: expect.arrayContaining([
            {
              userId: expect.any(String),
              projectId: expect.any(String),
              role: expect.any(String),
              user: expect.objectContaining({
                id: expect.any(String),
                email: expect.any(String),
                firstName: expect.any(String),
                lastName: expect.any(String),
              }),
            },
            {
              userId: expect.any(String),
              projectId: expect.any(String),
              role: expect.any(String),
              user: expect.objectContaining({
                id: expect.any(String),
                email: expect.any(String),
                firstName: expect.any(String),
                lastName: expect.any(String),
              }),
            },
            {
              userId: expect.any(String),
              projectId: expect.any(String),
              role: expect.any(String),
              user: expect.objectContaining({
                id: expect.any(String),
                email: expect.any(String),
                firstName: expect.any(String),
                lastName: expect.any(String),
              }),
            },
          ]),
          repositories: expect.any(Array),
          environments: expect.arrayContaining([
            {
              id: expect.any(String),
              dsoEnvironmentId: expect.any(String),
              projectId: expect.any(String),
              quotaId: expect.any(String),
              status: expect.any(String),
              permissions: expect.any(Array),
              clusters: expect.any(Array),
            },
            {
              id: expect.any(String),
              dsoEnvironmentId: expect.any(String),
              projectId: expect.any(String),
              quotaId: expect.any(String),
              status: expect.any(String),
              permissions: expect.any(Array),
              clusters: expect.any(Array),
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
