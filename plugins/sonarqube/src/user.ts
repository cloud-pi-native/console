import type { StepCall, ArchiveProjectExecArgs, CreateProjectExecArgs } from '@cpn-console/hooks'
import { generateRandomPassword, parseError } from '@cpn-console/hooks'
import { getAxiosInstance } from './tech.js'
import type { SonarPaging } from './project.js'

export type SonarUser = {
  login: string,
  name: string,
  active: boolean,
  email: string,
  groups: string[],
  tokensCount: number,
  local: boolean,
  externalIdentity: string,
  externalProvider: string,
  avatar: string,
  lastConnectionDate: Date,
  managed: boolean,
  sonarLintLastConnectionDate: Date
}

export const createUser: StepCall<CreateProjectExecArgs> = async (payload) => {
  const axiosInstance = getAxiosInstance()

  try {
    // @ts-ignore to delete when in own plugin
    if (!payload.apis.vault) throw Error('no Vault available')
    const { project, organization } = payload.args
    const username = `${organization}-${project}`
    const fakeEmail = `${project}@${organization}`
    const users: { paging: SonarPaging, users: SonarUser[] } = (await axiosInstance({
      url: 'users/search',
      params: {
        q: username,
      },
    }))?.data
    const user = users.users.find(u => u.login === username)
    const newPwd = generateRandomPassword(30)
    if (!user) {
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
    } else {
      await axiosInstance({
        url: 'users/change_password',
        params: {
          login: username,
          password: newPwd,
        },
      })
    }
    await axiosInstance({
      url: 'user_tokens/revoke',
      method: 'post',
      params: {
        login: username,
        name: `Sonar Token for ${project}`,
      },
    })
    const newToken = await axiosInstance({
      url: 'user_tokens/generate',
      method: 'post',
      params: {
        login: username,
        name: `Sonar Token for ${project}`,
      },
    })

    // @ts-ignore to delete when in own plugin
    await payload.apis.vault.write({
      SONAR_USERNAME: username,
      SONAR_PASSWORD: newPwd,
      SONAR_TOKEN: newToken.data.token,
    }, 'SONAR')

    return {
      status: {
        result: 'OK',
        message: `User ${user ? 're' : ''}created`,
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: error.message,
      },
    }
  }
}

export const deleteUser: StepCall<ArchiveProjectExecArgs> = async (payload) => {
  const axiosInstance = getAxiosInstance()

  const { project, organization } = payload.args
  const username = `${organization}-${project}`
  try {
    const users: { paging: SonarPaging, users: SonarUser[] } = (await axiosInstance({
      url: 'users/search',
      params: {
        q: username,
      },
    }))?.data
    const user = users.users.find(u => u.login === username)
    if (!user) {
      return {
        status: {
          result: 'OK',
          message: 'Already missing',
        },
      }
    }
    await axiosInstance({
      url: 'users/deactivate',
      params: {
        login: username,
        anonymize: true,
      },
      method: 'post',
    })
    return {
      status: {
        result: 'OK',
        message: 'User anonymized',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed',
      },
    }
  }
}
