import axios from 'axios'
import { axiosOptions } from './index.js'
import { generateRandomPassword } from '../../../utils/crypto.js'

const axiosInstance = axios.create(axiosOptions)

interface PluginResult {
  status: {
    result: string;
    message: string;
  };
  user?: any; // TODO: Regarder la documentation de Vault
  result: Record<string, any>;
  error?: string | Error;
  vault?: any; // TODO: Regarder ce que renvoie ce que ce plugin veut enregistrer dans Vault
}

export const createUser = async (payload) => {
  const { project, organization, owner } = payload.args
  const username = `${organization}-${project}`
  const res: PluginResult = {
    status: {
      result: 'OK',
      message: 'Password recreated',
    },
    result: {},
  }
  try {
    const users = (await axiosInstance({
      url: 'users/search',
      params: {
        q: username,
      },
    }))?.data
    const user = users.users.find(u => u.login === username)
    const newPwd = generateRandomPassword(30)
    if (!user) {
      res.status.message = 'User Created'
      const newUser = await axiosInstance({

        url: 'users/create',
        method: 'post',
        params: {
          email: owner.email,
          local: 'true',
          login: username,
          name: username,
          password: newPwd,
        },
      })
      res.user = newUser.data
    } else {
      await axiosInstance({
        url: 'users/change_password',
        params: {
          login: username,
          password: newPwd,
        },
      })
      res.user = user.user
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

    res.vault = [{
      name: 'SONAR',
      data: {
        SONAR_USERNAME: username,
        SONAR_PASSWORD: newPwd,
        SONAR_TOKEN: newToken.data.token,
      },
    }]

    return res
  } catch (error) {
    res.status = {
      result: 'KO',
      message: error.message,
    }
    res.error = JSON.stringify(error)
    return res
  }
}

export const deleteUser = async (payload) => {
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
