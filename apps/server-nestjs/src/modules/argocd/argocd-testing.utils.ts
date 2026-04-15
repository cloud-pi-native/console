import type { ProjectWithDetails } from './argocd-datastore.service.js'

import { faker } from '@faker-js/faker'

export function makeProjectDeploymentSource(
  overrides: Partial<ProjectWithDetails['deployments'][number]['deploymentSources'][number]> = {},
): ProjectWithDetails['deployments'][number]['deploymentSources'][number] {
  return {
    type: 'git',
    path: '.',
    targetRevision: 'HEAD',
    helmValuesFiles: '',
    repository: makeProjectRepository(),
    ...overrides,
  } satisfies ProjectWithDetails['deployments'][number]['deploymentSources'][number]
}

export function makeProjectDeployment(
  overrides: Partial<ProjectWithDetails['deployments'][number]> = {},
): ProjectWithDetails['deployments'][number] {
  return {
    id: faker.string.uuid(),
    name: faker.word.noun(),
    environment: makeProjectEnvironment(),
    autosync: true,
    deploymentSources: [
      {
        type: 'git',
        path: '.',
        targetRevision: 'HEAD',
        helmValuesFiles: '',
        repository: makeProjectRepository(),
      },
    ],
    ...overrides,
  } satisfies ProjectWithDetails['deployments'][number]
}

export function makeProjectRepository(
  overrides: Partial<ProjectWithDetails['repositories'][number]> = {},
): ProjectWithDetails['repositories'][number] {
  return {
    id: faker.string.uuid(),
    internalRepoName: faker.word.noun(),
    isInfra: false,
    deployRevision: 'HEAD',
    deployPath: '.',
    helmValuesFiles: '',
    ...overrides,
  } satisfies ProjectWithDetails['repositories'][number]
}

export function makeCluster(
  overrides: Partial<ProjectWithDetails['environments'][number]['cluster']> = {},
): ProjectWithDetails['environments'][number]['cluster'] {
  return {
    id: faker.string.uuid(),
    label: faker.word.noun(),
    zone: {
      slug: faker.word.noun(),
    },
    ...overrides,
  } satisfies ProjectWithDetails['environments'][number]['cluster']
}

export function makeProjectEnvironment(
  overrides: Partial<ProjectWithDetails['environments'][number]> = {},
): ProjectWithDetails['environments'][number] {
  return {
    id: faker.string.uuid(),
    name: faker.word.noun(),
    cluster: makeCluster(),
    cpu: 1,
    gpu: 0,
    memory: 1,
    autosync: true,
    ...overrides,
  } satisfies ProjectWithDetails['environments'][number]
}

export function makeProjectWithDetails(
  overrides: Partial<ProjectWithDetails> = {},
): ProjectWithDetails {
  return {
    id: faker.string.uuid(),
    slug: faker.helpers.slugify(faker.word.words({ count: 2 })).toLowerCase(),
    name: faker.word.noun(),
    environments: [makeProjectEnvironment()],
    repositories: [makeProjectRepository()],
    plugins: [],
    deployments: [makeProjectDeployment()],
    ...overrides,
  } satisfies ProjectWithDetails
}
