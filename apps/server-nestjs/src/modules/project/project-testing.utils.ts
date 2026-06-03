import type { CreateProjectBody, projectContract } from '@cpn-console/shared'
import type { Prisma, Project, ProjectMembers, User } from '@prisma/client'
import type { ProjectContext } from '../infrastructure/auth/project.guard'
import type { VaultMetadata, VaultSecret } from '../vault/vault-client.service'
import type { ProjectWithDetails } from './project-datastore.service'
import { PROJECT_PERMS } from '@cpn-console/shared'
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

export function makeProjectWithDetails(overrides: Partial<ProjectWithDetails> = {}): ProjectWithDetails {
  const owner = overrides.owner ?? makeUser()
  const id = faker.string.uuid()
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
  } satisfies ProjectWithDetails
}

export function makeProjectContext(overrides: Partial<ProjectContext> = {}): ProjectContext {
  return {
    id: faker.string.uuid(),
    slug: faker.string.alphanumeric(8).toLowerCase(),
    ownerId: faker.string.uuid(),
    locked: false,
    status: 'created' as const,
    everyonePerms: PROJECT_PERMS.GUEST,
    roles: [],
    members: [],
    ...overrides,
  } satisfies ProjectContext
}

export function makeCreateProjectBody(overrides: Partial<CreateProjectBody> = {}): CreateProjectBody {
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
  } satisfies CreateProjectBody
}

export function makeListProjectsQuery(overrides: Partial<typeof projectContract.listProjects.query._type> = {}): typeof projectContract.listProjects.query._type {
  return {
    filter: 'member' as const,
    ...overrides,
  } satisfies typeof projectContract.listProjects.query._type
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

export function makeVaultSecret<T extends Record<string, unknown> = Record<string, unknown>>(overrides: Partial<VaultSecret<T>> = {}): VaultSecret<T> {
  return {
    data: {} as T,
    metadata: makeVaultMetadata(),
    ...overrides,
  } satisfies VaultSecret<T>
}

function makeVaultMetadata(overrides: Partial<VaultMetadata> = {}): VaultMetadata {
  return {
    created_time: faker.date.past().toISOString(),
    custom_metadata: null,
    deletion_time: '',
    destroyed: false,
    version: 1,
    ...overrides,
  } satisfies VaultMetadata
}

export type ProjectWithMembers = Prisma.ProjectGetPayload<{
  include: { members: { include: { user: true } } }
}>

export function makeProjectWithMembersResult(
  project: ProjectWithDetails,
  members: Array<Prisma.ProjectMembersGetPayload<{ include: { user: true } }>> = [],
): ProjectWithMembers {
  return { ...project, members } as ProjectWithMembers
}
