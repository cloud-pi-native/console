import { api, axiosInstance } from './index.js'
import { generateRandomPassword } from '@/utils/crypto.js'
import type { StepCall } from '@/plugins/hooks/hook.js'
import type { ArchiveProjectExecArgs, CreateProjectExecArgs } from '@/plugins/hooks/project.js'

export const createUser: StepCall<CreateProjectExecArgs> = async (payload) => {
  const { project, organization } = payload.args
  const login = `${organization}-${project}`
  const fakeEmail = `${project}@${organization}`
  try {
    const users = (await axiosInstance({
      url: 'users/search',
      params: {
        q: login,
      },
    }))?.data
    const user = users.users.find(u => u.login === login)
    const newPwd = generateRandomPassword(30)
    if (!user) {
      await api.users.create({ email: fakeEmail, local: true, login, name: login, password: newPwd })
    } else {
      await api.users.changePassword(login, newPwd)
    }
    await api.userTokens.revoke(login, `Sonar Token for ${project}`)

    const newToken = await api.userTokens.generate(login, `Sonar Token for ${project}`)

    return {
      status: {
        result: 'OK',
        message: `User ${user ? 're' : ''}created`,
      },
      vault: [{
        name: 'SONAR',
        data: {
          SONAR_USERNAME: login,
          SONAR_PASSWORD: newPwd,
          SONAR_TOKEN: newToken.data.token,
        },
      }],
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

export const deleteDsoProject: StepCall<ArchiveProjectExecArgs> = async (payload) => {
  try {
    const { project, organization } = payload.args
    const username = `${organization}-${project}`
    const user = await api.users.search(username)
    if (user) {
      await api.users.delete(username)
    }
    return {
      status: {
        result: 'OK',
        message: user ? 'User anonymized' : 'Already missing',
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
