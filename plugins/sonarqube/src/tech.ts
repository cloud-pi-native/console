import axios from 'axios'
import { removeTrailingSlash, requiredEnv } from '@dso-console/shared'

const config: {
  url?: string
  user?: string
  password?: string
} = {}

export const getConfig = (): Required<typeof config> => {
  config.url = config.url ?? removeTrailingSlash(requiredEnv('SONARQUBE_URL'))
  config.user = config.user ?? requiredEnv('SONAR_API_TOKEN')
  // @ts-ignore
  return config
}
export const getAxiosOptions = () => {
  return {
    baseURL: `${getConfig().url}/api/`,
    auth: {
      username: getConfig().user,
      password: '', // Token is used, so password is useless
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }
}

export const getAxiosInstance = () => {
  return axios.create(getAxiosOptions())
}

export const purgeUsers = async () => {
  const axiosInstance = getAxiosInstance()
  const getUsers = await axiosInstance({
    url: 'users/search',
  })
  for (const user of getUsers.data.users) {
    if (user.login !== 'admin') {
      console.warn({ message: `${user.login} purged from sonarqube` })
      await axiosInstance({
        url: 'users/deactivate',
        params: {
          login: user.login,
          anonymize: true,
        },
        method: 'post',
      })
    }
  }
}
