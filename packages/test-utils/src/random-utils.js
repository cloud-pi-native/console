import { faker } from '@faker-js/faker'
import { achievedStatus, projectRoles } from 'shared/src/utils/iterables.js'

export const getRandomProjectName = () => {
  return faker.lorem.word()
}

export const getRandomGitUrl = () => {
  const url = faker.internet.url().split('.')[0] + '.git'
  return !url.startsWith('https://') ? 'https://' + url.split('://')[1] : url
}

export const getRandomOrganization = (name = 'ministere-interieur', label = 'Ministère de l\'Intérieur') => {
  return {
    id: faker.datatype.uuid(),
    name,
    label,
  }
}

export const getRandomProject = (organization = faker.datatype.uuid()) => {
  return {
    id: faker.datatype.uuid(),
    name: getRandomProjectName(),
    organization,
    status: faker.helpers.arrayElement(achievedStatus),
    locked: false,
  }
}

export const getRandomUser = () => {
  return {
    id: faker.datatype.uuid(),
    email: faker.internet.email(),
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
  }
}

export const getRandomUserProject = (userId = faker.datatype.uuid(), projectId = faker.datatype.uuid(), role = projectRoles[1]) => {
  return {
    UserId: userId,
    ProjectId: projectId,
    role,
  }
}

export const getRandomRepo = (projectId = faker.datatype.uuid()) => {
  const repo = {
    id: faker.datatype.uuid(),
    projectId,
    internalRepoName: faker.lorem.word(),
    externalRepoUrl: getRandomGitUrl(),
    isPrivate: faker.datatype.boolean(),
    isInfra: faker.datatype.boolean(),
    status: faker.helpers.arrayElement(achievedStatus),
  }
  if (repo.isPrivate) {
    repo.externalUserName = faker.internet.userName()
    repo.externalToken = faker.internet.password(25)
  }

  return repo
}

export const getRandomEnv = (name = 'dev', projectId = faker.datatype.uuid()) => {
  return {
    id: faker.datatype.uuid(),
    name,
    projectId,
    status: faker.helpers.arrayElement(achievedStatus),
  }
}

export const getRandomPerm = (environmentId = faker.datatype.uuid(), userId = faker.datatype.uuid()) => {
  return {
    environmentId,
    userId,
    level: faker.datatype.number({ min: 0, max: 1 }),
  }
}
