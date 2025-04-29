import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'

class Config {
  publicUrl: string
  internalUrl: string
  axiosOptions: {
    baseURL: string
    auth: {
      username: string
      password: string // Token is used, so password is useless
    }
    headers: {
      'Content-Type': string
    }
  }

  constructor() {
    this.publicUrl = removeTrailingSlash(requiredEnv('SONARQUBE_URL'))
    this.internalUrl = process.env.SONARQUBE_INTERNAL_URL
      ? removeTrailingSlash(process.env.SONARQUBE_INTERNAL_URL)
      : this.publicUrl

    this.axiosOptions = {
      baseURL: `${this.internalUrl}/api/`,
      auth: {
        username: requiredEnv('SONAR_API_TOKEN'),
        password: '',
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  }
}

let config: Config | undefined

function getConfig() {
  if (!config) {
    config = new Config()
  }
  return config
}
export default getConfig
