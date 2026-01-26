import { PluginApi } from '@cpn-console/hooks'
import { consoleGroupName, getGroupByName, getOrCreateChildGroup } from './group.js'
import { getkcClient } from './client.js'

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

  public async getOrCreateProjectGroup(name: string) {
    const kcClient = await getkcClient()
    const projectGroup = await getGroupByName(kcClient, this.projectSlug)
    if (!projectGroup) throw new Error(`Project group ${this.projectSlug} not found`)
    if (!projectGroup.id) throw new Error(`Project group ${this.projectSlug} has no id`)

    return getOrCreateChildGroup(kcClient, projectGroup.id, name)
  }
}
