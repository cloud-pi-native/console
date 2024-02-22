import type {
  DefaultArgs,
  Plugin,
} from '@cpn-console/hooks'
import { archiveDsoProject } from './functions.js'
import infos from './infos.js'
import monitor from './monitor.js'
import { VaultProjectApi } from './class.js'

const onlyApi = { api: (args: { organization: string, project: string }) => new VaultProjectApi(args.organization, args.project) }

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    addUserToProject: onlyApi,
    createProject: onlyApi,
    createRepository: onlyApi,
    deleteEnvironment: onlyApi,
    deleteRepository: onlyApi,
    getProjectSecrets: onlyApi,
    initializeEnvironment: onlyApi,
    removeUserFromProject: onlyApi,
    setEnvPermission: onlyApi,
    updateEnvironmentQuota: onlyApi,
    updateProject: onlyApi,
    updateRepository: onlyApi,
    archiveProject: {
      ...onlyApi,
      steps: { post: archiveDsoProject }, // Destroy all secrets for project
    },
  },
  monitor,
}

declare module '@cpn-console/hooks' {
  interface HookPayloadApis<Args extends DefaultArgs> {
    vault: Args extends { organization: string, project: string }
    ? VaultProjectApi
    : undefined
  }
}
