import { PluginApi } from '@cpn-console/hooks'
import { consoleGroupName } from './group'

interface KeycloakEnv {
  path: string
  subgroups: { // Key is the group name, value is the full path
    RO: string
    RW: string
  }
}

export class KeycloakProjectApi extends PluginApi {
  private readonly projectSlug: string

  constructor(projectSlug: string) {
    super()
    this.projectSlug = projectSlug
  }

  public async getProjectGroupPath(): Promise<string> {
    return `/${this.projectSlug}`
  }

  public async getEnvGroup(environment: string): Promise<KeycloakEnv> {
    return {
      path: `/${this.projectSlug}/${consoleGroupName}/${environment}`,
      subgroups: {
        RO: `/${this.projectSlug}/${consoleGroupName}/${environment}/RO`,
        RW: `/${this.projectSlug}/${consoleGroupName}/${environment}/RW`,
      },
    }
  }
}
