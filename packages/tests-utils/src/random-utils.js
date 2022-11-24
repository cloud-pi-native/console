import { faker } from '@faker-js/faker'
import { allOrgNames, allServices, allEnv } from 'shared'

export const getRandomUuid = () => {
  return faker.datatype.uuid()
}

export const getRandomProjectOrgName = () => {
  return faker.helpers.arrayElement(allOrgNames)
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
  }
}

export const getRandomRepo = () => {
  const repo = {
    internalRepoName: faker.lorem.word(),
    externalRepoUrl: getRandomGitUrl(),
    isPrivate: faker.datatype.boolean(),
    isInfra: faker.datatype.boolean(),
  }
  if (repo.isPrivate) {
    repo.externalUserName = faker.internet.userName()
    repo.externalToken = faker.internet.password(25)
  }

  return repo
}

export const getRandomEnvList = (nbEnv) => {
  return faker.helpers.arrayElements(allEnv, nbEnv)
}
