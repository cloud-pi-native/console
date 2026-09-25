import type { StageEnvironmentsRecord, StageRecord, StageWithClustersRecord } from './stage-queries.utils'
import { faker } from '@faker-js/faker'
import { makeEnvironment } from '../environment/environment-testing.utils'

export function makeStageRecord(overrides: Partial<StageRecord> = {}): StageRecord {
  return {
    id: faker.string.uuid(),
    name: faker.helpers.slugify(faker.word.sample(3)).toLowerCase().slice(0, 20),
    ...overrides,
  } satisfies StageRecord
}

export function makeStageWithClusters(overrides: Partial<StageWithClustersRecord> = {}): StageWithClustersRecord {
  return {
    id: faker.string.uuid(),
    name: faker.helpers.slugify(faker.word.sample(3)).toLowerCase().slice(0, 20),
    clusters: [{ id: faker.string.uuid() }],
    ...overrides,
  } satisfies StageWithClustersRecord
}

export function makeStageEnvironmentRecord(overrides: Partial<StageEnvironmentsRecord> = {}): StageEnvironmentsRecord {
  const environment = makeEnvironment()
  return {
    ...environment,
    cluster: { label: faker.helpers.slugify(faker.word.sample(3)).toLowerCase() },
    project: {
      slug: faker.helpers.slugify(faker.word.sample(3)).toLowerCase(),
      name: faker.company.name(),
      owner: {
        id: faker.string.uuid(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.past(),
        lastLogin: faker.date.past(),
        adminRoleIds: [],
        type: 'human' as const,
      },
    },
    ...overrides,
  } satisfies StageEnvironmentsRecord
}
