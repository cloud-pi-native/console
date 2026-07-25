import type { Cluster, Environment, Project, Stage } from '@prisma/client'
import type { EnvironmentWithCluster, EnvironmentWithStage } from './environment-datastore.service'
import { faker } from '@faker-js/faker'

export function makeEnvironment(overrides: Partial<Environment> = {}): Environment {
  return {
    id: faker.string.uuid(),
    name: faker.string.alphanumeric(8).toLowerCase(),
    projectId: faker.string.uuid(),
    memory: 2,
    cpu: 1,
    gpu: 0,
    autosync: true,
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    clusterId: faker.string.uuid(),
    stageId: faker.string.uuid(),
    ...overrides,
  }
}

export function makeCluster(overrides: Partial<Cluster> = {}): Cluster {
  return {
    id: faker.string.uuid(),
    label: faker.string.alphanumeric(8).toLowerCase(),
    privacy: 'public',
    secretName: faker.string.uuid(),
    clusterResources: false,
    kubeConfigId: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    infos: null,
    memory: 0,
    cpu: 0,
    gpu: 0,
    zoneId: faker.string.uuid(),
    ...overrides,
  }
}

export function makeStage(overrides: Partial<Stage> = {}): Stage {
  return {
    id: faker.string.uuid(),
    name: 'dev',
    ...overrides,
  }
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: faker.string.uuid(),
    name: faker.string.alphanumeric(8).toLowerCase(),
    description: '',
    status: 'created',
    locked: false,
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    everyonePerms: 896n,
    ownerId: faker.string.uuid(),
    slug: faker.string.alphanumeric(8).toLowerCase(),
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

export function makeEnvironmentWithCluster(overrides: Partial<EnvironmentWithCluster> = {}): EnvironmentWithCluster {
  const base = makeEnvironment(overrides)
  return {
    ...base,
    cluster: overrides.cluster ?? makeCluster({ id: base.clusterId }),
  }
}

export function makeEnvironmentWithStage(overrides: Partial<EnvironmentWithStage> = {}): EnvironmentWithStage {
  const base = makeEnvironment(overrides)
  return {
    ...base,
    stage: overrides.stage ?? makeStage({ id: base.stageId }),
  }
}
