import type {
  ClusterObject,
  Plugin,
  ProjectLite,
  ZoneObject,
} from '@cpn-console/hooks'
import {
  archiveDsoProject,
  deleteZone,
  deployAuth,
  getSecrets,
  upsertProject,
  upsertZone,
} from './functions'
import infos from './infos'
import monitor from './monitor'
import { VaultProjectApi, VaultZoneApi } from './class'

const onlyApi = { api: (project: ProjectLite) => new VaultProjectApi(project) }

export { VaultProjectApi, VaultZoneApi } from './class'

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
    upsertCluster: {
      api: (c: ClusterObject) => new VaultZoneApi(c.zone.slug),
    },
    deleteCluster: {
      api: (c: ClusterObject) => new VaultZoneApi(c.zone.slug),
    },
  },
  monitor,
}
