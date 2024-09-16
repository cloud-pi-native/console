import type { DeclareModuleGenerator, DefaultArgs, Plugin, Project, UniqueRepo } from '@cpn-console/hooks'
import { GitlabProjectApi } from './class.js'
import {
  checkApi,
  commitFiles,
  deleteDsoProject,
  getDsoProjectSecrets,
  syncRepository,
  upsertDsoProject,
} from './functions.js'
import infos from './infos.js'
import monitor from './monitor.js'
import { getGroupRootId } from './utils.js'

const onlyApi = { api: (project: Project | UniqueRepo) => new GitlabProjectApi(project) }

function start() {
  getGroupRootId()
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
  },
  monitor,
  start,
}

declare module '@cpn-console/hooks' {
  interface HookPayloadApis<Args extends DefaultArgs> {
    gitlab: Args extends Project | UniqueRepo
      ? GitlabProjectApi
      : undefined
  }
  interface ProjectStore extends DeclareModuleGenerator<typeof infos, 'project'> {}
  interface Config extends DeclareModuleGenerator<typeof infos, 'global'> {}
}
