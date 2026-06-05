import type { Project, ProjectMembers, User } from '@prisma/client'
import { faker } from '@faker-js/faker'

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    adminRoleIds: [] as string[],
    type: 'human' as const,
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    lastLogin: null,
    ...overrides,
  } satisfies User
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: faker.string.uuid(),
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
    everyonePerms: 0n,
    ownerId: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    lastSuccessProvisionningVersion: null,
    ...overrides,
  } satisfies Project
}

export function makeProjectMembers(overrides: Partial<ProjectMembers> = {}): ProjectMembers {
  return {
    projectId: faker.string.uuid(),
    userId: faker.string.uuid(),
    roleIds: [],
    ...overrides,
  } satisfies ProjectMembers
}

type ProjectMembersWithUser = ProjectMembers & { user: User }

export function makeProjectMemberWithUser(user: User, overrides: Partial<ProjectMembers> = {}): ProjectMembersWithUser {
  return {
    ...makeProjectMembers({ userId: user.id, ...overrides }),
    user,
  }
}
