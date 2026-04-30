import type { SonarqubeGeneratedToken, SonarqubeGroup, SonarqubePaging, SonarqubeProject, SonarqubeUser } from './sonarqube-client.service'
import type { ProjectWithDetails } from './sonarqube-datastore.service'
import { faker } from '@faker-js/faker'

export function makeUserToken(overrides: Partial<SonarqubeGeneratedToken> = {}) {
  return {
    token: faker.string.uuid(),
    login: faker.internet.username(),
    name: faker.person.fullName(),
    ...overrides,
  } satisfies SonarqubeGeneratedToken
}

export function makeEmptyGroupsResponse() {
  return { paging: makeSonarqubePaging(), groups: [] }
}

export function makeEmptyUsersResponse() {
  return { paging: makeSonarqubePaging(), users: [] }
}

export function makeEmptyProjectsResponse() {
  return { paging: makeSonarqubePaging(), components: [] }
}

export function makeProjectWithDetails(overrides: Partial<ProjectWithDetails> = {}): ProjectWithDetails {
  return {
    id: faker.string.uuid(),
    slug: faker.internet.domainWord(),
    repositories: [],
    plugins: [],
    ...overrides,
  } satisfies ProjectWithDetails
}

export function makeSonarqubeGroup(overrides: Partial<SonarqubeGroup> = {}): SonarqubeGroup {
  return {
    id: faker.string.uuid(),
    name: faker.internet.domainWord(),
    description: '',
    membersCount: 0,
    default: false,
    ...overrides,
  } satisfies SonarqubeGroup
}

export function makeSonarqubeUser(overrides: Partial<SonarqubeUser> = {}): SonarqubeUser {
  return {
    login: faker.internet.username(),
    name: faker.person.fullName(),
    active: true,
    email: faker.internet.email(),
    groups: [],
    tokensCount: 0,
    local: true,
    externalIdentity: '',
    externalProvider: '',
    managed: false,
    ...overrides,
  } satisfies SonarqubeUser
}

export function makeSonarqubeProject(overrides: Partial<SonarqubeProject> = {}): SonarqubeProject {
  return {
    key: faker.string.alphanumeric(20),
    name: faker.internet.domainWord(),
    qualifier: 'TRK',
    visibility: 'private',
    ...overrides,
  } satisfies SonarqubeProject
}

export function makeSonarqubePaging(overrides: Partial<SonarqubePaging> = {}): SonarqubePaging {
  return {
    pageIndex: 1,
    pageSize: 100,
    total: 0,
    ...overrides,
  } satisfies SonarqubePaging
}

export function makeSonarqubeGeneratedToken(overrides: Partial<SonarqubeGeneratedToken> = {}): SonarqubeGeneratedToken {
  return {
    token: faker.string.alphanumeric(40),
    login: faker.internet.username(),
    name: `Sonar Token for ${faker.internet.username()}`,
    ...overrides,
  } satisfies SonarqubeGeneratedToken
}
