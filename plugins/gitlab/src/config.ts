import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'

class Config {
  publicUrl: string
  internalUrl: string
  token: string
  projectsRootDir: string
  constructor() {
    this.token = requiredEnv('GITLAB_TOKEN')
    this.publicUrl = removeTrailingSlash(requiredEnv('GITLAB_URL'))
    this.projectsRootDir = requiredEnv('PROJECTS_ROOT_DIR')
    this.internalUrl = process.env.GITLAB_INTERNAL_URL
      ? removeTrailingSlash(process.env.GITLAB_INTERNAL_URL)
      : this.publicUrl
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
