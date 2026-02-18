// import type { StepCall, ArchiveProjectExecArgs } from '@cpn-console/hooks'
import { generateRandomPassword } from '@cpn-console/hooks'
import type { VaultSonarSecret } from './tech.js'
import { getAxiosInstance } from './tech.js'
import type { SonarPaging } from './project.js'

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
  function userPredicate(user: SonarUser) {
    return user.login === username
  }
  let page = 1
  const pageSize = 100
  while (true) {
    const response = await axiosInstance({
      url: 'users/search',
      params: {
        q: username,
        p: page,
        ps: pageSize,
      },
    })
    const users: { paging: SonarPaging, users: SonarUser[] } = response.data
    const found = users.users.find(userPredicate)
    if (found) return found
    if (!users.users.length || users.paging.pageIndex * users.paging.pageSize >= users.paging.total) {
      break
    }
    page += 1
  }
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
