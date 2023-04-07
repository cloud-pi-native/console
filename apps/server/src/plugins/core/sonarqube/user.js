import axios from 'axios'
import { axiosOptions } from './index.js'
import { generateRandomPassword } from '../../../utils/crypto.js'

export const createUser = async (payload) => {
  const { project, organization, email } = payload.args
  const username = `${organization}-${project}`
  const res = {
    status: {
      result: 'OK',
      message: 'Password recreated',
    },
    result: {},
  }
  try {
    const users = (await axios({
      ...axiosOptions,
      url: 'users/search',
      params: {
        q: username,
      },
    }))?.data
    const user = users.users.find(u => u.login === username)
    const newPwd = generateRandomPassword(30)
    if (!user) {
      res.status.message = 'User Created'
      const newUser = await axios({
        ...axiosOptions,
        url: 'users/create',
        method: 'post',
        params: {
          email,
          local: 'true',
          login: username,
          name: username,
          password: newPwd,
        },
      })
      res.user = newUser.data
    } else {
      await axios({
        ...axiosOptions,
        url: 'users/change_password',
        params: {
          login: username,
          password: newPwd,
        },
      })
      res.user = user.user
    }
    await axios({
      ...axiosOptions,
      url: 'user_tokens/revoke',
      method: 'post',
      params: {
        login: username,
        name: `Sonar Token for ${project}`,
      },
    })
    const newToken = await axios({
      ...axiosOptions,
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
  const res = {
    status: {
      result: 'OK',
      message: 'User deleted',
    },
  }
  try {
    const users = (await axios({
      ...axiosOptions,
      url: 'users/search',
      params: {
        q: username,
      },
    }))?.data
    // TODO : tableau users vide + à quoi sert const res ici ?
    console.log({ users })
    const user = users.users.find(u => u.login === username)
    if (!user) {
      return {
        status: {
          result: 'OK',
          message: 'Already missing',
        },
      }
    }
    await axios({
      ...axiosOptions,
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
    res.status = { result: 'KO', message: error.message }
    return res
  }
}
