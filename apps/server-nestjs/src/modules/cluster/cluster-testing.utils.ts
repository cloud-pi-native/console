import type { Cluster, Environment, Kubeconfig, ProjectMembers, Stage, User } from '@prisma/client'
import { faker } from '@faker-js/faker'
import type { ClusterDetailsRecord, ClusterEnvironmentsRecord, ClusterListRecord } from './cluster-queries.utils'

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

export function makeStage(overrides: Partial<Stage> = {}): Stage {
  return {
    id: faker.string.uuid(),
    name: faker.helpers.slugify(faker.word.sample(3)).toLowerCase(),
    ...overrides,
  } satisfies Stage
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    lastLogin: faker.date.past(),
    adminRoleIds: [],
    type: 'human',
    ...overrides,
  } satisfies User
}

export function makeProjectMember(overrides: Partial<ProjectMembers> = {}): ProjectMembers {
  return {
    projectId: faker.string.uuid(),
    userId: faker.string.uuid(),
    roleIds: [],
    ...overrides,
  } satisfies ProjectMembers
}

export function makeClusterListRecord(overrides: Partial<ClusterListRecord> = {}): ClusterListRecord {
  return {
    ...makeCluster(),
    stages: [makeStage()],
    ...overrides,
  } satisfies ClusterListRecord
}

export function makeClusterDetailsRecord(overrides: Partial<ClusterDetailsRecord> = {}): ClusterDetailsRecord {
  return {
    ...makeCluster(),
    projects: [{ id: faker.string.uuid() }],
    stages: [makeStage()],
    kubeconfig: makeKubeconfig(),
    ...overrides,
  } satisfies ClusterDetailsRecord
}

export function makeClusterEnvironmentsRecord(overrides: Partial<ClusterEnvironmentsRecord> = {}): ClusterEnvironmentsRecord {
  return {
    id: faker.string.uuid(),
    name: faker.helpers.slugify(faker.word.sample(3)).toLowerCase().slice(0, 11),
    cpu: faker.number.int({ min: 0, max: 16 }),
    gpu: faker.number.int({ min: 0, max: 4 }),
    memory: faker.number.int({ min: 0, max: 64 }),
    projectId: faker.string.uuid(),
    autosync: true,
    clusterId: faker.string.uuid(),
    stageId: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    project: {
      slug: faker.helpers.slugify(faker.word.sample(3)).toLowerCase(),
      name: faker.company.name(),
      owner: makeUser(),
      members: [makeProjectMember()],
    },
    ...overrides,
  } satisfies ClusterEnvironmentsRecord
}

export function makeKubeconfig(overrides: Partial<Kubeconfig> = {}): Kubeconfig {
  return {
    id: faker.string.uuid(),
    user: {
      username: faker.internet.userName(),
      token: faker.string.alphanumeric(20),
    },
    cluster: {
      server: faker.internet.url(),
      tlsServerName: faker.internet.domainName(),
    },
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    ...overrides,
  } satisfies Kubeconfig
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
