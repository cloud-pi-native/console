import type { DeclareModuleGenerator, DefaultArgs, Plugin, Project, UniqueRepo, ZoneObject } from '@cpn-console/hooks'
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
import { getGroupRootId } from './utils.js'
import infos from './infos.js'
import monitor from './monitor.js'
import { GitlabProjectApi, GitlabZoneApi } from './class.js'

const onlyApi = { api: (project: Project | UniqueRepo) => new GitlabProjectApi(project) }

function start() {
  getGroupRootId().catch((error) => {
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
        main: upsertZone,
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

declare module '@cpn-console/hooks' {
  interface HookPayloadApis<Args extends DefaultArgs> {
    gitlab: Args extends Project | UniqueRepo
      ? GitlabProjectApi
      : Args extends ZoneObject
        ? GitlabZoneApi
        : undefined
  }
  interface ProjectStore extends DeclareModuleGenerator<typeof infos, 'project'> {}
  interface Config extends DeclareModuleGenerator<typeof infos, 'global'> {}
  interface PluginResult {
    warnReasons?: string[]
  }
}
