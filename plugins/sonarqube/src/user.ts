// import type { StepCall, ArchiveProjectExecArgs } from '@cpn-console/hooks'
import { generateRandomPassword } from '@cpn-console/hooks'
import { VaultSonarSecret, getAxiosInstance } from './tech.js'
import type { SonarPaging } from './project.js'

export type SonarUser = {
  login: string
  name: string
  active: boolean
  email: string
  groups: string[]
  tokensCount: number
  local: boolean
  externalIdentity: string
  externalProvider: string
  avatar: string
  lastConnectionDate: Date
  managed: boolean
  sonarLintLastConnectionDate: Date
}

export const createUser = async (username: string, projectName: string, organizationName: string) => {
  const axiosInstance = getAxiosInstance()
  const fakeEmail = `${projectName}@${organizationName}`

  const newPwd = generateRandomPassword(30)
  await axiosInstance({
    url: 'users/create',
    method: 'post',
    params: {
      email: fakeEmail,
      local: 'true',
      login: username,
      name: username,
      password: newPwd,
    },
  })
  return newPwd
}

export const changeToken = async (username: string) => {
  const axiosInstance = getAxiosInstance()
  await axiosInstance({
    url: 'user_tokens/revoke',
    method: 'post',
    params: {
      login: username,
      name: `Sonar Token for ${username}`,
    },
  })
  const newToken = await axiosInstance({
    url: 'user_tokens/generate',
    method: 'post',
    params: {
      login: username,
      name: `Sonar Token for ${username}`,
    },
  })
  return newToken.data.token
}

export const getUser = async (username: string): Promise<SonarUser | undefined> => {
  const axiosInstance = getAxiosInstance()
  const users: { paging: SonarPaging, users: SonarUser[] } = (await axiosInstance({
    url: 'users/search',
    params: {
      q: username,
    },
  }))?.data
  return users.users.find(u => u.login === username)
}

export const ensureUserExists = async (username: string, projectName: string, organizationName: string, vaultUserSecret: VaultSonarSecret | undefined): Promise<VaultSonarSecret | undefined> => {
  const user = await getUser(username)
  if (!user) {
    return {
      SONAR_PASSWORD: await createUser(username, projectName, organizationName),
      SONAR_TOKEN: await changeToken(username),
      SONAR_USERNAME: username,
    }
  }
  else if (!vaultUserSecret) {
    return {
      SONAR_PASSWORD: 'not initialized',
      SONAR_TOKEN: await changeToken(username),
      SONAR_USERNAME: username,
    }
  }
}
