import {
  getRandomProjectEmail,
  getRandomProjectName,
  getRandomProjectOrgName,
  getRandomProjectRepo,
  getRandomProjectServices
} from './random-util.js'

export const createRandomProject = () => {
  return {
    email: getRandomProjectEmail(),
    orgName: getRandomProjectOrgName(),
    projectName: getRandomProjectName(),
    services: getRandomProjectServices(),
    repo: getRandomProjectRepo(3),
  }
}