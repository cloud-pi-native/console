import type { PROJECT_PERMS, projectContract } from '@cpn-console/shared'
import type { Prisma, ProjectMembers, User } from '@prisma/client'
import type { ProjectContext } from '../../infrastructure/permission/project/project.guard.js'
import type { ProjectDetails } from './project-queries.utils.js'
import { randomUUID } from 'node:crypto'
import { faker } from '@faker-js/faker'

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: randomUUID(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    adminRoleIds: [],
    type: 'human',
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    lastLogin: null,
    ...overrides,
  }
}

export function makeProjectMembers(overrides: Partial<ProjectMembers> = {}): ProjectMembers {
  return {
    projectId: randomUUID(),
    userId: randomUUID(),
    roleIds: [],
    ...overrides,
  }
}

type ProjectMembersWithUser = ProjectMembers & { user: User }

export function makeProjectMemberWithUser(user: User, overrides: Partial<ProjectMembers> = {}): ProjectMembersWithUser {
  return {
    ...makeProjectMembers({ userId: user.id, ...overrides }),
    user,
  }
}

export function makeProjectWithDetails(overrides: Partial<ProjectDetails> = {}): ProjectDetails {
  const owner = overrides.owner ?? makeUser()
  const id = overrides.id ?? randomUUID()
  return {
    id,
    name: faker.string.alphanumeric(8).toLowerCase(),
    slug: faker.string.alphanumeric(8).toLowerCase(),
    description: faker.lorem.sentence(),
    status: 'created',
    locked: false,
    limitless: false,
    hprodCpu: 1,
    hprodGpu: 0,
    hprodMemory: 2,
    prodCpu: 1,
    prodGpu: 0,
    prodMemory: 2,
    everyonePerms: PROJECT_PERMS.GUEST,
    ownerId: owner.id,
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    lastSuccessProvisionningVersion: null,
    owner,
    members: [],
    plugins: [],
    roles: [],
    repositories: [],
    environments: [],
    deployments: [],
    clusters: [],
    ...overrides,
  }
}

export function makeProjectContext(overrides: Partial<ProjectContext> = {}): ProjectContext {
  return {
    id: randomUUID(),
    slug: faker.string.alphanumeric(8).toLowerCase(),
    locked: false,
    status: 'created',
    ...overrides,
  }
}

type ProjectSelect = Prisma.ProjectGetPayload<{ select: typeof import('./project-queries.utils.js').projectSelect }>

export function makeProject(overrides: Partial<ProjectSelect> = {}): ProjectSelect {
  const id = overrides.id ?? randomUUID()
  return {
    id,
    name: faker.string.alphanumeric(8).toLowerCase(),
    slug: faker.string.alphanumeric(8).toLowerCase(),
    description: '',
    status: 'created',
    locked: false,
    limitless: false,
    hprodCpu: 0,
    hprodGpu: 0,
    hprodMemory: 0,
    prodCpu: 0,
    prodGpu: 0,
    prodMemory: 0,
    everyonePerms: 896n,
    ownerId: randomUUID(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    lastSuccessProvisionningVersion: null,
    owner: {
      id: randomUUID(),
      email: 'owner@example.com',
      firstName: 'Owner',
      lastName: 'Test',
      adminRoleIds: [],
      type: 'human',
      createdAt: faker.date.past(),
      updatedAt: faker.date.past(),
      lastLogin: faker.date.past(),
    },
    members: [],
    plugins: [],
    roles: [],
    repositories: [],
    environments: [],
    deployments: [],
    clusters: [],
    ...overrides,
  }
}

export type ProjectWithMembers = Prisma.ProjectGetPayload<{
  include: { members: { include: { user: true } } }
}>

export function makeProjectWithMembersResult(
  project: ProjectDetails,
  members: Array<Prisma.ProjectMembersGetPayload<{ include: { user: true } }>> = [],
): ProjectWithMembers {
  return { ...project, members } as ProjectWithMembers
}

export function makeCreateProjectBody(overrides: Partial<typeof projectContract.createProject.body._type> = {}): typeof projectContract.createProject.body._type {
  return {
    name: faker.string.alphanumeric({ length: faker.number.int({ min: 2, max: 20 }) }).toLowerCase(),
    description: faker.lorem.sentence(),
    limitless: true,
    hprodCpu: faker.number.float({ min: 0, max: 10, fractionDigits: 2 }),
    hprodGpu: faker.number.float({ min: 0, max: 10, fractionDigits: 2 }),
    hprodMemory: faker.number.float({ min: 0, max: 10, fractionDigits: 2 }),
    prodCpu: faker.number.float({ min: 0, max: 10, fractionDigits: 2 }),
    prodGpu: faker.number.float({ min: 0, max: 10, fractionDigits: 2 }),
    prodMemory: faker.number.float({ min: 0, max: 10, fractionDigits: 2 }),
    ...overrides,
  }
}

export function makeListProjectsQuery(overrides: Partial<typeof projectContract.listProjects.query._type> = {}): typeof projectContract.listProjects.query._type {
  return {
    filter: 'member',
    ...overrides,
  }
}
