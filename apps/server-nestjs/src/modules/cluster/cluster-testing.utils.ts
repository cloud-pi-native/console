import type { Cluster, Kubeconfig, Stage } from '@prisma/client'
import type { ClusterDetailsRecord, ClusterEnvironmentsRecord, ClusterListRecord } from './cluster-queries.utils'
import { faker } from '@faker-js/faker'
import { makeProjectMembers } from '../project-members/project-members-testing.utils'
import { makeUser } from '../project/project-testing.utils'

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
      members: [makeProjectMembers()],
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
