import {
  getRandomUser,
  getRandomProjectName,
  getRandomProjectOrgName,
  getRandomProjectRepos,
  getRandomProjectServices,
  getRandomProjectUsers,
} from './random-util.js'

export const createRandomProject = () => {
  return {
    owner: getRandomUser(),
    orgName: getRandomProjectOrgName(),
    projectName: getRandomProjectName(),
    services: getRandomProjectServices(),
    repos: getRandomProjectRepos(3),
    users: getRandomProjectUsers(3),
  }
}
