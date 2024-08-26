import axios from 'axios'
import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'

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

export type VaultSonarSecret = {
  SONAR_USERNAME: string
  SONAR_PASSWORD: string
  SONAR_TOKEN: string
}
