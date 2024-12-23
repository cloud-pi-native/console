import axios from 'axios'
import getConfig from './config.js'

export function getAxiosInstance() {
  return axios.create(getConfig().axiosOptions)
}

export interface VaultSonarSecret {
  SONAR_USERNAME: string
  SONAR_PASSWORD: string
  SONAR_TOKEN: string
}
