import type { Prisma, ProjectMembers, User } from '@prisma/client'
import { faker } from '@faker-js/faker'
import type { ProjectContext } from '../infrastructure/permission/project/project.guard.js'
import type { ProjectDetails } from './project-queries.utils.js'
import { PROJECT_PERMS } from '@cpn-console/shared'

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
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
    projectId: faker.string.uuid(),
    userId: faker.string.uuid(),
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
  const id = overrides.id ?? faker.string.uuid()
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
    id: faker.string.uuid(),
    slug: faker.string.alphanumeric(8).toLowerCase(),
    locked: false,
    status: 'created',
    ...overrides,
  }
}

type Project = Prisma.ProjectGetPayload<{ select: typeof import('./project-queries.utils.js').projectSelect }>

export function makeProject(overrides: Partial<Project> = {}): Project {
  const id = overrides.id ?? faker.string.uuid()
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
    ownerId: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    lastSuccessProvisionningVersion: null,
    owner: {
      id: faker.string.uuid(),
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
