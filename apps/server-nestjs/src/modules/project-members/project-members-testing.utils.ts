import type { ProjectMembers } from '@prisma/client'
import { faker } from '@faker-js/faker'

export function makeProjectMembers(overrides: Partial<ProjectMembers> = {}): ProjectMembers {
  return {
    projectId: faker.string.uuid(),
    userId: faker.string.uuid(),
    roleIds: [],
    ...overrides,
  } satisfies ProjectMembers
}
