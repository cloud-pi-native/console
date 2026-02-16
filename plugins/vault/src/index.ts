import type { ClusterObject, DefaultArgs, Plugin, Project, ProjectLite, ZoneObject } from '@cpn-console/hooks'
import { archiveDsoProject, deleteZone, getSecrets, upsertProject, upsertZone } from './functions.js'
import infos from './infos.js'
import monitor from './monitor.js'
import { VaultProjectApi } from './vault-project-api.js'
import { VaultZoneApi } from './vault-zone-api.js'

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
    upsertCluster: {
      api: (c: ClusterObject) => new VaultZoneApi(c.zone.slug),
    },
    deleteCluster: {
      api: (c: ClusterObject) => new VaultZoneApi(c.zone.slug),
    },
  },
  monitor,
}

declare module '@cpn-console/hooks' {
  interface HookPayloadApis<Args extends DefaultArgs> {
    vault: Args extends (ProjectLite | Project)
      ? VaultProjectApi
      : Args extends (ZoneObject | ClusterObject)
        ? VaultZoneApi
        : never
  }
}
