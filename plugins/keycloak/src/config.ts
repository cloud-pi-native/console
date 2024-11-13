import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'

class Config {
  url: string
  realm: string

  constructor() {
    this.url = process.env.KEYCLOAK_INTERNAL_URL
      ? removeTrailingSlash(process.env.KEYCLOAK_INTERNAL_URL)
      : `${requiredEnv('KEYCLOAK_PROTOCOL')}://${requiredEnv('KEYCLOAK_DOMAIN')}`
    this.realm = requiredEnv('KEYCLOAK_REALM')
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
