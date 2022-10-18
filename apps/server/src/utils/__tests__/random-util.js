import { faker } from '@faker-js/faker'
import { allOrgNames, allServices } from '../project.js'

export const getRandomProjectEmail = () => {
  return faker.internet.email()
}

export const getRandomProjectOrgName = () => {
  return faker.helpers.arrayElement(allOrgNames)
}

export const getRandomProjectName = () => {
  return faker.lorem.word()
}

export const getRandomProjectServices = () => {
  return faker.helpers.arrayElements(allServices)
}

export const getRandomProjectRepo = (length = 1) => {
  const repo = []
  for (let i = 0; i < length;) {
    const projectRepo = {}

    projectRepo.gitName = faker.lorem.word()
    projectRepo.gitSourceName = faker.lorem.word()
    projectRepo.managerName = faker.name.fullName()
    projectRepo.isPrivate = faker.datatype.boolean()
    if (projectRepo.isPrivate) projectRepo.gitToken = faker.git.shortSha()

    repo.push(projectRepo)
    i++
  }
  return repo
}