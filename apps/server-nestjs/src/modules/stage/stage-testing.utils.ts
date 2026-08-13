import type { Cluster, Environment } from '@prisma/client'
import type { StageEnvironmentsRecord, StageRecord, StageWithClustersRecord } from './stage-queries.utils'
import { faker } from '@faker-js/faker'

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

export function makeCluster(overrides: Partial<Cluster> = {}): Cluster {
  return {
    id: faker.string.uuid(),
    label: faker.helpers.slugify(faker.word.sample(5)).toLowerCase(),
    privacy: faker.helpers.arrayElement(['public', 'dedicated'] as const),
    secretName: faker.string.uuid(),
    clusterResources: faker.datatype.boolean(),
    kubeConfigId: faker.string.uuid(),
    infos: faker.lorem.sentence(),
    cpu: faker.number.int({ min: 0, max: 64 }),
    gpu: faker.number.int({ min: 0, max: 8 }),
    memory: faker.number.int({ min: 0, max: 512 }),
    zoneId: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    ...overrides,
  } satisfies Cluster
}

export function makeEnvironment(overrides: Partial<Environment> = {}): Environment {
  return {
    id: faker.string.uuid(),
    name: faker.helpers.slugify(faker.word.sample(3)).toLowerCase().slice(0, 11),
    projectId: faker.string.uuid(),
    memory: faker.number.int({ min: 0, max: 64 }),
    cpu: faker.number.int({ min: 0, max: 16 }),
    gpu: faker.number.int({ min: 0, max: 4 }),
    autosync: faker.datatype.boolean(),
    clusterId: faker.string.uuid(),
    stageId: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    ...overrides,
  } satisfies Environment
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
