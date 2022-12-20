import { repeatFn } from './func-utils.js'
import {
  getRandomProjectName,
  getRandomProjectOrgName,
  getRandomProjectServices,
  getRandomRepo,
  getRandomUser,
  getRandomEnvList,
  getRandomStatus,
} from './random-utils.js'

export const createRandomProject = (nbRepos = 3, nbUsers = 3, nbEnv = 3) => ({
  owner: getRandomUser(),
  orgName: getRandomProjectOrgName(),
  projectName: getRandomProjectName(),
  services: getRandomProjectServices(),
  repos: repeatFn(nbRepos)(getRandomRepo),
  users: repeatFn(nbUsers)(getRandomUser),
  envList: getRandomEnvList(nbEnv),
  status: getRandomStatus(),
})
