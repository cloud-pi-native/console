import { faker } from '@faker-js/faker'
import { achievedStatus, projectRoles } from 'shared'

export const getRandomProjectName = () => {
  return faker.lorem.word()
}

export const getRandomGitUrl = () => {
  const url = faker.internet.url().split('.')[0] + '.git'
  return !url.startsWith('https://') ? 'https://' + url.split('://')[1] : url
}

export const getRandomOrganization = (name = 'ministere-interieur', label = 'Ministère de l\'Intérieur', source = 'dso-console') => {
  return {
    id: faker.datatype.uuid(),
    name,
    label,
    source,
    active: true,
  }
}

export const getRandomProject = (organization = faker.datatype.uuid()) => {
  return {
    id: faker.datatype.uuid(),
    name: getRandomProjectName(),
    organization,
    description: faker.lorem.sentence(),
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

export const getRandomUserProject = (userId = faker.datatype.uuid(), role = projectRoles[1]) => {
  return {
    id: userId,
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

export const getRandomPerm = (environmentId = faker.datatype.uuid(), user = getRandomUser()) => {
  return {
    id: faker.datatype.uuid(),
    environmentId,
    userId: user.id,
    level: faker.datatype.number({ min: 0, max: 1 }),
    user,
  }
}
