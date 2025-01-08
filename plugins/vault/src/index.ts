import type { DefaultArgs, Plugin, Project, ProjectLite, ZoneObject } from '@cpn-console/hooks'
import { archiveDsoProject, deleteZone, deployAuth, getSecrets, upsertProject, upsertZone } from './functions.js'
import infos from './infos.js'
import monitor from './monitor.js'
import { VaultProjectApi, VaultZoneApi } from './class.js'

const onlyApi = { api: (project: ProjectLite) => new VaultProjectApi(project) }

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    getProjectSecrets: {
      ...onlyApi,
      steps: {
        main: getSecrets,
      },
    },
    upsertProject: {
      ...onlyApi,
      steps: {
        main: upsertProject,
        post: deployAuth,
      },
    },
    deleteProject: {
      ...onlyApi,
      steps: { post: archiveDsoProject }, // Destroy all secrets for project
    },
    upsertZone: {
      api: (zone: ZoneObject) => new VaultZoneApi(zone.slug),
      steps: {
        pre: upsertZone,
      },
    },
    deleteZone: {
      api: (zone: ZoneObject) => new VaultZoneApi(zone.slug),
      steps: {
        main: deleteZone,
      },
    },
  },
  monitor,
}

declare module '@cpn-console/hooks' {
  interface HookPayloadApis<Args extends DefaultArgs> {
    vault: Args extends (ProjectLite | Project)
      ? VaultProjectApi
      : Args extends (ZoneObject)
        ? VaultZoneApi
        : never
  }
}
