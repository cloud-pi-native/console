import { faker } from '@faker-js/faker'
import { achievedStatus, projectRoles, logActions, type ProjectRoles, type AchievedStatus, ClusterPrivacy, Stage, Quota } from '@cpn-console/shared'
import { repeatFn } from './func-utils.js'
import { Cluster, Environment, Log, Organization, Permission, Project, Repository, User, Role } from './types.js'

export const getRandomProjectName = () => {
  return faker.lorem.word()
}

export const getRandomGitUrl = () => {
  const url = faker.internet.url().split('.')[0] + '.git'
  return !url.startsWith('https://') ? 'https://' + url.split('://')[1] : url
}

export const getRandomOrganization = (name = 'mi', label = 'Ministère de l\'Intérieur', source = 'dso-console') => {
  return {
    id: faker.string.uuid(),
    name,
    label,
    source,
    active: true,
  } as Organization
}

export const getRandomProject = (organizationId = faker.string.uuid()) => {
  return {
    id: faker.string.uuid(),
    name: getRandomProjectName(),
    organizationId,
    organization: getRandomOrganization(),
    description: faker.lorem.sentence(8),
    status: faker.helpers.arrayElement(achievedStatus),
    locked: false,
  } as Project & { status: AchievedStatus }
}

export const getRandomZone = () => ({
  id: faker.string.uuid(),
  slug: faker.lorem.word({ length: { min: 1, max: 10 } }),
  label: faker.lorem.word({ length: { min: 1, max: 50 } }),
  description: faker.lorem.sentence(8),
})

export const getRandomCluster = (
  { projectIds = repeatFn(2)(faker.string.uuid), stageIds = repeatFn(2)(faker.string.uuid), privacy = faker.helpers.arrayElement(Object.values(ClusterPrivacy)), zoneId = faker.string.uuid() }:
    { projectIds?: string[], stageIds?: string[], privacy?: ClusterPrivacy, zoneId?: string },
) => {
  return {
    id: faker.string.uuid(),
    label: faker.lorem.word(),
    infos: faker.lorem.sentence(8),
    zoneId,
    projectIds: privacy === ClusterPrivacy.DEDICATED ? projectIds : [],
    stageIds,
    user: {
      certData: 'userCAD',
      keyData: 'userCKD',
    },
    cluster: {
      caData: 'clusterCAD',
      server: 'https://coucou.com:5000',
      tlsServerName: 'coucou.com',
    },
    privacy,
    clusterResources: faker.datatype.boolean(),
    secretName: faker.internet.password({ length: 50 }),
  } as Cluster
}

export const getRandomUser = () => {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
  } as User
}

export const getRandomRole = (
  userId = faker.string.uuid(),
  projectId = faker.string.uuid(),
  role: ProjectRoles = projectRoles[1],
) => {
  return {
    userId,
    role,
    projectId,
  } as Role
}

export const getRandomRepo = (projectId = faker.string.uuid()) => {
  const repo: Repository = {
    id: faker.string.uuid(),
    projectId,
    internalRepoName: faker.lorem.word(),
    externalRepoUrl: getRandomGitUrl(),
    isPrivate: faker.datatype.boolean(),
    isInfra: faker.datatype.boolean(),
  }
  if (repo.isPrivate) {
    repo.externalUserName = faker.person.firstName()
    repo.externalToken = faker.internet.password({ length: 25 })
  }

  return repo
}

export const getRandomStage = (
  name: string = faker.lorem.word({ length: { min: 2, max: 20 } }),
  links?: {
    quotaIds?: string[], quotas?: Quota[]
    clusterIds?: string[], clusters?: Cluster[]
  },
) => {
  return {
    id: faker.string.uuid(),
    name,
    quotaIds: links?.quotaIds ?? links?.quotas?.map(({ id }) => id) ?? [] as string[],
    clusterIds: links?.clusterIds ?? links?.clusters?.map(({ id }) => id) ?? [] as string[],
  }
}

export const getRandomQuota = (
  name: string = faker.lorem.word(),
  links?: { stageIds?: string[], stages?: Stage[] },
) => {
  return {
    id: faker.string.uuid(),
    name,
    cpu: faker.number.int({ min: 1, max: 18 }),
    memory: faker.number.int({ max: 18 }) + 'Gi',
    isPrivate: faker.datatype.boolean(),
    stageIds: links?.stageIds ?? links?.stages?.map(({ id }) => id) ?? [] as string[],
  }
}

export const getRandomEnv = (
  name = faker.lorem.slug(1),
  projectId = faker.string.uuid(),
  stageId = faker.string.uuid(),
  quotaId = faker.string.uuid(),
  clusterId = faker.string.uuid(),
) => {
  return {
    id: faker.string.uuid(),
    name,
    projectId,
    quotaId,
    stageId,
    clusterId,
  } as Environment
}

export const getRandomPerm = (environmentId = faker.string.uuid(), user = getRandomUser()) => {
  return {
    id: faker.string.uuid(),
    environmentId,
    userId: user.id,
    level: faker.number.int({ min: 0, max: 2 }),
    user,
  } as Permission
}

export const getRandomLog = (action = faker.helpers.arrayElement(logActions), userId = faker.string.uuid()) => {
  return {
    id: faker.string.uuid(),
    action,
    userId,
  } as Log
}
