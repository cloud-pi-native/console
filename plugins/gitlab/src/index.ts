import type { Plugin, Project, UniqueRepo } from '@cpn-console/hooks'
import {
  checkApi,
  commitFiles,
  deleteDsoProject,
  deleteZone,
  getDsoProjectSecrets,
  syncRepository,
  upsertDsoProject,
  upsertZone,
} from './functions.js'
import { getOrCreateGroupRoot } from './utils'
import infos from './infos'
import monitor from './monitor'
import { GitlabProjectApi, GitlabZoneApi } from './class'

const onlyApi = { api: (project: Project | UniqueRepo) => new GitlabProjectApi(project) }

function start() {
  getOrCreateGroupRoot().catch((error) => {
    console.log(error)
    throw new Error('Error at gitlab plugin start')
  })
}

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    deleteProject: {
      ...onlyApi,
      steps: {
        main: deleteDsoProject,
        post: commitFiles,
      },
    },
    upsertProject: {
      ...onlyApi,
      steps: {
        check: checkApi,
        main: upsertDsoProject,
        post: commitFiles,
      },
    },
    getProjectSecrets: { steps: { main: getDsoProjectSecrets } },
    syncRepository: {
      ...onlyApi,
      steps: {
        main: syncRepository,
        post: commitFiles,
      },
    },
    upsertZone: {
      api: () => new GitlabZoneApi(),
      steps: {
        pre: upsertZone,
        post: commitFiles,
      },
    },
    deleteZone: {
      api: () => new GitlabZoneApi(),
      steps: {
        main: deleteZone,
      },
    },
  },
  monitor,
  start,
}

export { GitlabProjectApi, GitlabZoneApi } from './class'
