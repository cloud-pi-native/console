import { describe, expect, it } from 'vitest'
import prisma from '../../__mocks__/prisma.js'
import { initializeProject } from './queries.js'
import { PROJECT_PERMS } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'

describe('initializeProject', () => {
  it('should create project with default system roles', async () => {
    const params = {
      name: 'test-project',
      description: 'test',
      ownerId: faker.string.uuid(),
      slug: 'test-project',
      limitless: false,
      hprodCpu: faker.number.int({ min: 0, max: 1000 }),
      hprodGpu: faker.number.int({ min: 0, max: 1000 }),
      hprodMemory: faker.number.int({ min: 0, max: 1000 }),
      prodCpu: faker.number.int({ min: 0, max: 1000 }),
      prodGpu: faker.number.int({ min: 0, max: 1000 }),
      prodMemory: faker.number.int({ min: 0, max: 1000 }),
    }

    prisma.project.create.mockResolvedValue({ id: 'project-id', ...params } as any)

    await initializeProject(params)

    expect(prisma.project.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        ...params,
        roles: {
          create: expect.arrayContaining([
            {
              name: 'Administrateur',
              permissions: PROJECT_PERMS.MANAGE,
              position: 0,
              oidcGroup: 'project-test-project-admin',
              type: 'system',
            },
            {
              name: 'DevOps',
              permissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS | PROJECT_PERMS.MANAGE_REPOSITORIES | PROJECT_PERMS.REPLAY_HOOKS | PROJECT_PERMS.SEE_SECRETS | PROJECT_PERMS.LIST_ENVIRONMENTS | PROJECT_PERMS.LIST_REPOSITORIES,
              position: 1,
              oidcGroup: 'project-test-project-devops',
              type: 'system',
            },
            {
              name: 'Développer',
              permissions: PROJECT_PERMS.MANAGE_REPOSITORIES | PROJECT_PERMS.LIST_ENVIRONMENTS | PROJECT_PERMS.LIST_REPOSITORIES,
              position: 2,
              oidcGroup: 'project-test-project-developer',
              type: 'system',
            },
            {
              name: 'Lecture seule',
              permissions: PROJECT_PERMS.LIST_ENVIRONMENTS | PROJECT_PERMS.LIST_REPOSITORIES,
              position: 3,
              oidcGroup: 'project-test-project-readonly',
              type: 'system',
            },
          ]),
        },
      }),
    }))
  })
})
