import type {
  Deployment,
  DeploymentExternalValueSource,
  DeploymentExternalValuesRef,
  DeploymentInternalValueSource,
  DeploymentSource,
  Environment,
  Prisma,
  Repository,
} from '@prisma/client'
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
    branchName: 'main',
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

type DeploymentSourceWithRepository = DeploymentSource & {
  repository: Repository
  internalValueSources: DeploymentInternalValueSource[]
  externalValuesRef: DeploymentExternalValuesRefWithValueSources | null
}

type DeploymentExternalValuesRefWithValueSources = DeploymentExternalValuesRef & {
  valueSources: DeploymentExternalValueSource[]
}

export function makeDeploymentInternalValueSource(overrides: Partial<DeploymentInternalValueSource> = {}): DeploymentInternalValueSource {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    deploymentSourceId: faker.string.uuid(),
    order: 0,
    path: 'values.yaml',
    ...overrides,
  }
}

export function makeDeploymentExternalValueSource(overrides: Partial<DeploymentExternalValueSource> = {}): DeploymentExternalValueSource {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    externalValuesRefId: faker.string.uuid(),
    order: 0,
    path: 'values.yaml',
    ...overrides,
  }
}

export function makeDeploymentExternalValuesRef(overrides: Partial<DeploymentExternalValuesRefWithValueSources> = {}): DeploymentExternalValuesRefWithValueSources {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    deploymentSourceId: faker.string.uuid(),
    ref: 'main',
    targetRevision: '',
    repositoryId: faker.string.uuid(),
    valueSources: [],
    ...overrides,
  }
}

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
    internalValueSources: [],
    externalValuesRef: null,
    ...overrides,
  }
}

export type DeploymentWithRelations = Prisma.DeploymentGetPayload<{
  include: {
    environment: true
    deploymentSources: {
      include: {
        repository: true
        internalValueSources: true
        externalValuesRef: { include: { valueSources: true } }
      }
    }
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
