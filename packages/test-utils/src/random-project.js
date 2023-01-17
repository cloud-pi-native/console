import { repeatFn } from './func-utils.js'
import {
  getRandomProjectName,
  getRandomProjectOrgName,
  getRandomProjectServices,
  getRandomRepo,
  getRandomUser,
  getRandomEnvList,
} from './random-utils.js'
import { allEnv } from 'shared/src/utils/iterables.js'

export const createRandomProject = (nbRepos = 3, nbUsers = 3, envList = allEnv) => ({
  owner: getRandomUser(),
  orgName: getRandomProjectOrgName(),
  projectName: getRandomProjectName(),
  services: getRandomProjectServices(),
  repos: repeatFn(nbRepos)(getRandomRepo),
  users: repeatFn(nbUsers)(getRandomUser),
  envList: getRandomEnvList(envList),
})
