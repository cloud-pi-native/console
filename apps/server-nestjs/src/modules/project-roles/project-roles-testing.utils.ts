import type { Project, ProjectMembers, ProjectRole } from '@prisma/client'
import { faker } from '@faker-js/faker'

interface ProjectRoleWithMembers extends ProjectRole {
  members?: Array<unknown>
}

interface ProjectRoleWithProject extends ProjectRole {
  project: Pick<Project, 'slug'>
}

export function makeProjectRole(overrides: Partial<ProjectRole> = {}): ProjectRole {
  return {
    id: faker.string.uuid(),
    name: faker.person.jobTitle(),
    permissions: faker.number.bigInt({ min: 0n, max: 64n }),
    projectId: faker.string.uuid(),
    position: faker.number.int({ min: 0, max: 100 }),
    oidcGroup: '',
    type: 'managed',
    ...overrides,
  }
}

export function makeProjectRoleWithMembers(overrides: Partial<ProjectRoleWithMembers> = {}): ProjectRoleWithMembers {
  return {
    ...makeProjectRole(overrides),
    members: overrides.members ?? [],
  }
}

export function makeProjectRoleWithProject(overrides: Partial<ProjectRoleWithProject> = {}): ProjectRoleWithProject {
  const role = makeProjectRole(overrides)
  return {
    ...role,
    project: overrides.project ?? { slug: faker.helpers.slugify(faker.company.name()) },
  }
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    description: '',
    status: 'initializing',
    locked: false,
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    everyonePerms: 896n,
    ownerId: faker.string.uuid(),
    slug: faker.helpers.slugify(faker.company.name()),
    limitless: true,
    hprodCpu: 0,
    hprodGpu: 0,
    hprodMemory: 0,
    prodCpu: 0,
    prodGpu: 0,
    prodMemory: 0,
    lastSuccessProvisionningVersion: null,
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
