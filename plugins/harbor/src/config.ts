import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'

class Config {
  publicUrl: string
  internalUrl: string
  host: string
  apiConfig: {
    auth: {
      username: string
      password: string
    }
    baseURL: string
  }

  constructor() {
    this.publicUrl = removeTrailingSlash(requiredEnv('HARBOR_URL'))
    this.internalUrl = process.env.HARBOR_INTERNAL_URL
      ? removeTrailingSlash(process.env.HARBOR_INTERNAL_URL)
      : this.publicUrl
    this.host = this.publicUrl?.split('://')[1]
    this.apiConfig = { auth: {
      username: requiredEnv('HARBOR_ADMIN'),
      password: requiredEnv('HARBOR_ADMIN_PASSWORD'),
    }, baseURL: `${this.publicUrl}/api/v2.0/` }
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
