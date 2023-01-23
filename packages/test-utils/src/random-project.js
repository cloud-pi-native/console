import { faker } from '@faker-js/faker'
import {
  getRandomProjectName,
  getRandomProjectOrgName,
  getRandomUser,
} from './random-utils.js'
import { allEnv, achievedStatus } from 'shared/src/utils/iterables.js'

export const createRandomProject = (nbRepos = 3, nbUsers = 1, envList = allEnv) => {
  const owner = getRandomUser()
  return {
    name: getRandomProjectName(),
    ownerId: owner.id,
    organization: getRandomProjectOrgName(),
    // services: getRandomProjectServices(),
    // repos: repeatFn(nbRepos)(getRandomRepo),
    usersId: [owner.id],
    // envList: getRandomEnvList(envList),
    status: faker.helpers.arrayElement(achievedStatus),
  }
}
