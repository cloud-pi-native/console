import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'
import axios from 'axios'

const config: {
  url?: string
  user?: string
  password?: string
} = {}

export function getConfig(): Required<typeof config> {
  config.url = config.url ?? removeTrailingSlash(requiredEnv('SONARQUBE_URL'))
  config.user = config.user ?? requiredEnv('SONAR_API_TOKEN')
  // @ts-ignore
  return config
}
export function getAxiosOptions() {
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

export function getAxiosInstance() {
  return axios.create(getAxiosOptions())
}

export interface VaultSonarSecret {
  SONAR_USERNAME: string
  SONAR_PASSWORD: string
  SONAR_TOKEN: string
}
