import { faker } from '@faker-js/faker'
import { type AchievedStatus, type ClusterDetails, ClusterPrivacy, type ProjectRoles, type Stage, type Zone, achievedStatus, logActions, projectRoles } from '@cpn-console/shared'
import { repeatFn } from './func-utils.js'
import type { Cluster, Environment, Log, Member, Permission, Project, Repository, Role, User } from './types.js'

export function getRandomProjectName() {
  return faker.lorem.word()
}

export function getRandomGitUrl() {
  const url = `${faker.internet.url().split('.')[0]}.git`
  return url.startsWith('https://') ? url : `https://${url.split('://')[1]}`
}

export function getRandomProject(): Project & { status: AchievedStatus, members?: Member[] } {
  const name = getRandomProjectName()
  return {
    id: faker.string.uuid(),
    name,
    slug: `${name}-1`,
    description: faker.lorem.sentence(8),
    status: faker.helpers.arrayElement(achievedStatus),
    locked: false,
    updatedAt: (new Date()).toISOString(),
    createdAt: (new Date()).toISOString(),
  }
}

export function getRandomZone(): Zone {
  return {
    id: faker.string.uuid(),
    slug: faker.lorem.word({ length: { min: 1, max: 10 } }),
    label: faker.lorem.word({ length: { min: 1, max: 50 } }),
    argocdUrl: faker.internet.url(),
    description: faker.lorem.sentence(8),
  }
}

export function getRandomCluster({ projectIds = repeatFn(2)(faker.string.uuid), stageIds = repeatFn(2)(faker.string.uuid), privacy = faker.helpers.arrayElement(Object.values(ClusterPrivacy)), zoneId = faker.string.uuid() }:
{ projectIds?: string[], stageIds?: string[], privacy?: ClusterPrivacy, zoneId?: string }): ClusterDetails {
  return {
    id: faker.string.uuid(),
    label: faker.lorem.word(),
    infos: faker.lorem.sentence(8),
    cpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
    gpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
    memory: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
    zoneId,
    projectIds: privacy === ClusterPrivacy.DEDICATED ? projectIds : [],
    stageIds,
    kubeconfig: {
      user: {
        certData: 'userCAD',
        keyData: 'userCKD',
      },
      cluster: {
        caData: 'clusterCAD',
        server: 'https://coucou.com:5000',
        tlsServerName: 'coucou.com',
      },
    },
    privacy,
    clusterResources: faker.datatype.boolean(),
  }
}

export function getRandomUser(id = faker.string.uuid()): User {
  return {
    id,
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
  }
}

export function getRandomRole(userId = faker.string.uuid(), projectId = faker.string.uuid(), role: ProjectRoles = projectRoles[1]): Role {
  return {
    userId,
    role,
    projectId,
  }
}

export function getRandomMember(userId = faker.string.uuid(), role: ProjectRoles = projectRoles[1]): Member {
  return {
    userId,
    role,
  }
}

export function getRandomRepo(projectId = faker.string.uuid()): Repository {
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

export function getRandomStage(name: string = faker.lorem.word({ length: { min: 2, max: 20 } }), links?: {
  clusterIds?: string[]
  clusters?: Cluster[]
}): Stage {
  return {
    id: faker.string.uuid(),
    name,
    clusterIds: links?.clusterIds ?? links?.clusters?.map(({ id }) => id) ?? [] as string[],
  }
}

export function getRandomEnv(name = faker.lorem.slug(1), projectId = faker.string.uuid(), stageId = faker.string.uuid(), clusterId = faker.string.uuid()): Environment {
  return {
    id: faker.string.uuid(),
    name,
    cpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
    gpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
    memory: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
    projectId,
    stageId,
    clusterId,
  }
}

export function getRandomPerm(environmentId = faker.string.uuid(), user = getRandomUser(), level = faker.number.int({ min: 0, max: 2 })): Permission {
  return {
    id: faker.string.uuid(),
    environmentId,
    userId: user.id,
    level,
    user,
  }
}

export function getRandomLog(action = faker.helpers.arrayElement(logActions), userId = faker.string.uuid()): Log {
  return {
    id: faker.string.uuid(),
    action,
    userId,
    updatedAt: (new Date()).toISOString(),
    createdAt: (new Date()).toISOString(),
    data: {
      args: {},
      failed: faker.datatype.boolean(),
      results: {},
      totalExecutionTime: 1,
    },
    requestId: null,
  }
}
