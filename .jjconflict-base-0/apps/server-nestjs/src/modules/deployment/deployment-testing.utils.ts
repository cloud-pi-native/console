import type { Deployment, DeploymentSource, Environment, Prisma, Repository } from '@prisma/client'
import { faker } from '@faker-js/faker'

export function makeDeployment(overrides: Partial<Deployment> = {}): Deployment {
  return {
    id: faker.string.uuid(),
    projectId: faker.string.uuid(),
    name: faker.string.alphanumeric(8).toLowerCase(),
    autosync: true,
    environmentId: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    ...overrides,
  }
}

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

export function makeRepository(overrides: Partial<Repository> = {}): Repository {
  return {
    id: faker.string.uuid(),
    projectId: faker.string.uuid(),
    internalRepoName: faker.string.alphanumeric(8).toLowerCase(),
    externalRepoUrl: '',
    externalUserName: '',
    isInfra: false,
    isPrivate: false,
    deployRevision: '',
    deployPath: '',
    helmValuesFiles: '',
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    ...overrides,
  }
}

type DeploymentSourceWithRepository = DeploymentSource & { repository: Repository }

export function makeDeploymentSource(overrides: Partial<DeploymentSourceWithRepository> = {}): DeploymentSourceWithRepository {
  const repositoryId = overrides.repositoryId ?? faker.string.uuid()
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    deploymentId: faker.string.uuid(),
    repositoryId,
    type: 'git',
    targetRevision: 'main',
    path: '/app',
    helmValuesFiles: '',
    repository: makeRepository({ id: repositoryId }),
    ...overrides,
  }
}

export type DeploymentWithRelations = Prisma.DeploymentGetPayload<{
  include: {
    environment: true
    deploymentSources: { include: { repository: true } }
  }
}>

export function makeDeploymentWithRelations(overrides: Partial<DeploymentWithRelations> = {}): DeploymentWithRelations {
  const base = makeDeployment(overrides)
  return {
    ...base,
    environment: overrides.environment ?? makeEnvironment({ id: base.environmentId, projectId: base.projectId }),
    deploymentSources: overrides.deploymentSources ?? [makeDeploymentSource({ deploymentId: base.id })],
  }
}
