import {
  getRandomUser,
  getRandomProjectName,
  getRandomProjectOrgName,
  getRandomProjectRepos,
  getRandomProjectServices,
  getRandomEnvList,
  getRandomProjectUsers,
} from './random-util.js'

export const createRandomProject = () => {
  return {
    owner: getRandomUser(),
    orgName: getRandomProjectOrgName(),
    projectName: getRandomProjectName(),
    services: getRandomProjectServices(),
    envList: getRandomEnvList(),
    repos: getRandomProjectRepos(3),
    users: getRandomProjectUsers(3),
  }
}
