import {
  getRandomEnvList,
  getRandomProjectName,
  getRandomProjectOrgName,
  getRandomRepo,
  getRandomUser,
} from './random-utils.js'

export const createRandomAnsibleProject = (nbEnv = 3) => {
  return {
    env: 'pprod',
    extra: {
      orgName: getRandomProjectOrgName(),
      ownerEmail: getRandomUser().email,
      projectName: getRandomProjectName(),
      envList: getRandomEnvList(nbEnv),
    },
  }
}

export const createRandomAnsibleRepo = (nbEnv = 3) => {
  const randomRepo = getRandomRepo()
  const data = {
    env: 'pprod',
    extra: {
      orgName: getRandomProjectOrgName(),
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
