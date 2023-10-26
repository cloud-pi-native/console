import { axiosInstance } from './index.js'
import { generateRandomPassword } from '@/utils/crypto.js'
import type { StepCall } from '@/plugins/hooks/hook.js'
import type { ArchiveProjectExecArgs, CreateProjectExecArgs } from '@/plugins/hooks/project.js'

export const createUser: StepCall<CreateProjectExecArgs> = async (payload) => {
  try {
    if (!payload.vault) throw Error('no Vault available')
    const { project, organization } = payload.args
    const username = `${organization}-${project}`
    const fakeEmail = `${project}@${organization}`
    const users = (await axiosInstance({
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

    await payload.vault.write({
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
      status: {
        result: 'KO',
        message: error.message,
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteUser: StepCall<ArchiveProjectExecArgs> = async (payload) => {
  const { project, organization } = payload.args
  const username = `${organization}-${project}`
  try {
    const users = (await axiosInstance({
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
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}
