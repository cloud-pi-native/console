import { faker } from '@faker-js/faker'
import { achievedStatus, projectRoles, logActions, type ProjectRoles, type AchievedStatus, ClusterPrivacy } from '@dso-console/shared'
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
  } as Project & { status: AchievedStatus}
}

export const getRandomCluster = (projectIds = repeatFn(2)(faker.string.uuid), stageIds = repeatFn(2)(faker.string.uuid)) => {
  return {
    id: faker.string.uuid(),
    label: faker.lorem.word(),
    infos: faker.lorem.sentence(8),
    projectIds,
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
    privacy: faker.helpers.arrayElement(Object.values(ClusterPrivacy)),
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
  const repo: Repository & { status: AchievedStatus} = {
    id: faker.string.uuid(),
    projectId,
    internalRepoName: faker.lorem.word(),
    externalRepoUrl: getRandomGitUrl(),
    isPrivate: faker.datatype.boolean(),
    isInfra: faker.datatype.boolean(),
    status: faker.helpers.arrayElement(achievedStatus),
  }
  if (repo.isPrivate) {
    repo.externalUserName = faker.person.firstName()
    repo.externalToken = faker.internet.password({ length: 25 })
  }

  return repo
}

export const getRandomStage = (name: string = faker.lorem.word()) => {
  return {
    id: faker.string.uuid(),
    name,
  }
}

export const getRandomQuota = (name: string = faker.lorem.word()) => {
  return {
    id: faker.string.uuid(),
    name,
    cpu: faker.number.int({ min: 1, max: 18 }),
    memory: faker.number.int({ max: 18 }) + 'Gi',
    isPrivate: faker.datatype.boolean(),
  }
}

export const getRandomQuotaStage = (quotaId: string, stageId: string, status: 'active' | 'pendingDelete' = faker.helpers.arrayElement(['active', 'pendingDelete'])) => {
  return {
    id: faker.string.uuid(),
    quotaId,
    stageId,
    status,
  }
}

export const getRandomEnv = (name = faker.lorem.slug(1), projectId = faker.string.uuid(), quotaStageId = faker.string.uuid(), clusterId = faker.string.uuid()) => {
  return {
    id: faker.string.uuid(),
    name,
    projectId,
    quotaStageId,
    clusterId,
    status: faker.helpers.arrayElement(achievedStatus),
  } as Environment & { status: AchievedStatus }
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
