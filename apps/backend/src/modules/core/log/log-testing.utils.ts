import type { Log } from '@prisma/client'
import { faker } from '@faker-js/faker'

export function makeLog(overrides: Partial<Log> = {}): Log {
  return {
    id: faker.string.uuid(),
    data: {},
    action: faker.word.verb(),
    userId: null,
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    requestId: faker.string.uuid(),
    projectId: faker.string.uuid(),
    ...overrides,
  }
}
