import {
  getRandomOwner,
  getRandomProjectName,
  getRandomProjectOrgName,
  getRandomProjectRepo,
  getRandomProjectServices,
} from './random-util.js'

export const createRandomProject = () => {
  return {
    owner: getRandomOwner(),
    orgName: getRandomProjectOrgName(),
    projectName: getRandomProjectName(),
    services: getRandomProjectServices(),
    repo: getRandomProjectRepo(3),
  }
}
