// import type { StepCall, ArchiveProjectExecArgs } from '@cpn-console/hooks'
import { generateRandomPassword } from '@cpn-console/hooks'
import type { VaultSonarSecret } from './tech'
import { getAxiosInstance } from './tech'
import type { SonarPaging } from './project'

export interface SonarUser {
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

export async function createUser(username: string, projectSlug: string) {
  const axiosInstance = getAxiosInstance()
  const fakeEmail = `${projectSlug}@${projectSlug}`

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

export async function changeToken(username: string) {
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

export async function getUser(username: string): Promise<SonarUser | undefined> {
  const axiosInstance = getAxiosInstance()
  const users: { paging: SonarPaging, users: SonarUser[] } = (await axiosInstance({
    url: 'users/search',
    params: {
      q: username,
    },
  }))?.data
  return users.users.find(u => u.login === username)
}

export async function ensureUserExists(username: string, projectSlug: string, vaultUserSecret: VaultSonarSecret | undefined): Promise<VaultSonarSecret | undefined> {
  const user = await getUser(username)
  if (!user) {
    return {
      SONAR_PASSWORD: await createUser(username, projectSlug),
      SONAR_TOKEN: await changeToken(username),
      SONAR_USERNAME: username,
    }
  } else if (!vaultUserSecret) {
    return {
      SONAR_PASSWORD: 'not initialized',
      SONAR_TOKEN: await changeToken(username),
      SONAR_USERNAME: username,
    }
  }
}
