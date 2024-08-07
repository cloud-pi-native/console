import type { DefaultArgs, Plugin, Project, ProjectLite } from '@cpn-console/hooks'
import { archiveDsoProject, upsertProjectAppRole } from './functions.js'
import infos from './infos.js'
import monitor from './monitor.js'
import { VaultProjectApi } from './class.js'

const onlyApi = { api: (project: ProjectLite) => new VaultProjectApi(project) }

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    getProjectSecrets: onlyApi,
    upsertProject: {
      ...onlyApi,
      steps: { main: upsertProjectAppRole },
    },
    deleteProject: {
      ...onlyApi,
      steps: { post: archiveDsoProject }, // Destroy all secrets for project
    },
  },
  monitor,
}

declare module '@cpn-console/hooks' {
  interface HookPayloadApis<Args extends DefaultArgs> {
    vault: Args extends (ProjectLite | Project)
      ? VaultProjectApi
      : undefined
  }
}
