import {
  getRandomOwner,
  getRandomProjectName,
  getRandomProjectOrgName,
  getRandomProjectRepos,
  getRandomProjectServices,
} from './random-util.js'

export const createRandomProject = () => {
  return {
    owner: getRandomOwner(),
    orgName: getRandomProjectOrgName(),
    projectName: getRandomProjectName(),
    services: getRandomProjectServices(),
    repos: getRandomProjectRepos(3),
  }
}
