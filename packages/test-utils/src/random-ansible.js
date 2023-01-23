import {
  getRandomEnv,
  getRandomProjectName,
  getRandomProjectOrganization,
  getRandomRepo,
  getRandomUser,
} from './random-utils.js'
import { allEnv } from 'shared/src/utils/iterables.js'

export const createRandomAnsibleProject = (envList = allEnv) => {
  return {
    env: 'pprod',
    extra: {
      orgName: getRandomProjectOrganization(),
      ownerEmail: getRandomUser().email,
      projectName: getRandomProjectName(),
      envList: getRandomEnv(envList),
    },
  }
}

export const createRandomAnsibleRepo = (nbEnv = 3) => {
  const randomRepo = getRandomRepo()
  const data = {
    env: 'pprod',
    extra: {
      orgName: getRandomProjectOrganization(),
      ownerEmail: getRandomUser().email,
      projectName: getRandomProjectName(),
      internalRepoName: randomRepo.internalRepoName,
      externalRepoUrl: randomRepo.externalRepoUrl,
    },
  }
  if (randomRepo.isPrivate) {
    data.extra.externalUserName = randomRepo.externalUserName
    data.extra.externalToken = randomRepo.externalToken
  }
  return data
}
