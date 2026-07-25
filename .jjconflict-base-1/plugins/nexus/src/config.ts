import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'

class Config {
  publicUrl: string
  internalUrl: string
  secretExposedUrl: string
  user: string
  password: string

  constructor() {
    this.password = requiredEnv('NEXUS_ADMIN_PASSWORD')
    this.user = requiredEnv('NEXUS_ADMIN')
    this.publicUrl = removeTrailingSlash(requiredEnv('NEXUS_URL'))
    this.internalUrl = process.env.NEXUS_INTERNAL_URL
      ? removeTrailingSlash(process.env.NEXUS_INTERNAL_URL)
      : this.publicUrl
    this.secretExposedUrl = process.env.NEXUS__SECRET_EXPOSE_INTERNAL_URL === 'true' ? this.internalUrl : this.publicUrl
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
