import { faker } from '@faker-js/faker'
import { allOrganizations, allServices, achievedStatus } from 'shared/src/utils/iterables.js'

export const getRandomUuid = () => {
  return faker.datatype.uuid()
}

export const getRandomProjectOrgName = () => {
  return faker.helpers.arrayElement(allOrganizations)
}

export const getRandomProjectName = () => {
  return faker.lorem.word()
}

export const getRandomProjectServices = () => {
  return allServices
}

export const getRandomGitUrl = () => {
  const url = faker.internet.url().split('.')[0] + '.git'
  return !url.startsWith('https://') ? 'https://' + url.split('://')[1] : url
}

export const getRandomUser = () => {
  return {
    id: faker.datatype.uuid(),
    email: faker.internet.email(),
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    status: faker.helpers.arrayElement(achievedStatus),
  }
}

export const getRandomRepo = () => {
  const repo = {
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

export const getRandomEnvList = (envList) => {
  return envList.map(env => ({
    envName: env,
    ro: [faker.datatype.uuid()],
    rw: [faker.datatype.uuid()],
    status: faker.helpers.arrayElement(achievedStatus),
  }))
}
