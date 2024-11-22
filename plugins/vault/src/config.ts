import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'

class Config {
  publicUrl: string
  internalUrl: string
  token: string
  projectsRootDir: string
  hideProjectService: boolean
  disableVaultSecrets: boolean
  constructor() {
    this.token = requiredEnv('VAULT_TOKEN')
    this.publicUrl = removeTrailingSlash(requiredEnv('VAULT_URL'))
    this.projectsRootDir = requiredEnv('PROJECTS_ROOT_DIR')
    this.internalUrl = process.env.VAULT_INTERNAL_URL
      ? removeTrailingSlash(process.env.VAULT_INTERNAL_URL)
      : this.publicUrl
    this.hideProjectService = process.env.VAULT__HIDE_PROJECT_SERVICE === 'true'
    this.disableVaultSecrets = process.env.VAULT__DISABLE_VAULT_SECRETS === 'true'
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
