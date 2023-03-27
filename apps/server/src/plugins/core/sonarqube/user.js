import axios from 'axios'
import { axiosOptions } from './index.js'
import { generate } from 'generate-password'

export const createUser = async (payload) => {
  const { name, organization, email } = payload.args
  const username = `${organization}-${name}`
  const res = {
    status: {
      result: 'OK',
      message: 'Password recreated',
    },
    result: {},
  }
  try {
    const getUsers = await axios({
      ...axiosOptions,
      url: 'users/search',
      params: {
        q: username,
      },
    })
    const user = getUsers.data.users.find(u => u.login === username)
    const newPwd = generate({
      length: 30,
      numbers: true,
    })
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
        name: `Sonar Token for ${name}`,
      },
    })
    const newToken = await axios({
      ...axiosOptions,
      url: 'user_tokens/generate',
      method: 'post',
      params: {
        login: username,
        name: `Sonar Token for ${name}`,
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
    res.status = { result: 'KO', message: error.message }
    return res
  }
}

export const deleteUser = async (payload) => {
  const { name, organization } = payload.args
  const username = `${organization}-${name}`
  const res = {
    status: {
      result: 'OK',
      message: 'Password recreated',
    },
  }
  try {
    const getUsers = await axios({
      ...axiosOptions,
      url: 'users/search',
      params: {
        q: username,
      },
    })
    const user = getUsers.data.users.find(u => u.login === username)
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
