import { faker } from '@faker-js/faker'
import { allOrgNames, allServices } from 'shared/src/schemas/project.js'

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

export const getRandomProjectRepos = (length = 1) => {
  const repos = []
  for (let i = 0; i < length;) {
    const projectRepo = {}
    const httpsUrl = (url) => !url.startsWith('https://') ? 'https://' + url.split('://')[1] : url

    projectRepo.internalRepoName = faker.lorem.word()
    projectRepo.externalRepoUrl = httpsUrl(faker.internet.url())
    projectRepo.externalUserName = faker.name.fullName()
    projectRepo.isPrivate = faker.datatype.boolean()
    if (projectRepo.isPrivate) projectRepo.externalToken = faker.git.shortSha()

    repos.push(projectRepo)
    i++
  }
  return repos
}

export const getRandomProjectUsers = (length = 1) => {
  const users = []
  for (let i = 0; i < length;) {
    users.push(getRandomUser())
    i++
  }
  return users
}

export const getRandomUser = () => {
  const owner = {}

  owner.id = faker.datatype.uuid()
  owner.email = faker.internet.email()
  owner.firstName = faker.name.firstName()
  owner.lastName = faker.name.lastName()

  return owner
}
