import type { Plugin, Project, DefaultArgs } from '@cpn-console/hooks'
import {
  checkApi,
  getDsoProjectSecrets,
  deleteDsoProject,
  upsertDsoProject,
} from './functions.js'
import { getGroupRootId } from './utils.js'
import infos from './infos.js'
import monitor from './monitor.js'
import { GitlabProjectApi } from './class.js'

const onlyApi = { api: (project: Project) => new GitlabProjectApi(project) }

const start = () => {
  getGroupRootId()
}

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    deleteProject: {
      ...onlyApi,
      steps: { main: deleteDsoProject },
    },
    upsertProject: {
      ...onlyApi,
      steps: {
        check: checkApi,
        main: upsertDsoProject,
      },
    },
    getProjectSecrets: { steps: { main: getDsoProjectSecrets } },
  },
  monitor,
  start,
}

declare module '@cpn-console/hooks' {
  interface HookPayloadApis<Args extends DefaultArgs> {
    gitlab: Args extends Project
    ? GitlabProjectApi
    : undefined
  }
}
