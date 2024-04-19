import type { Plugin } from '@cpn-console/hooks'
import { createDsoProject, deleteDsoProject, getProjectSecrets } from './functions.js'
import infos from './infos.js'
import monitor from './monitor.js'
import type { SwitchParam } from '@cpn-console/shared'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    upsertProject: { steps: { post: createDsoProject } },
    deleteProject: { steps: { main: deleteDsoProject } },
    getProjectSecrets: { steps: { main: getProjectSecrets } },
  },
  monitor,
}

declare module '@cpn-console/hooks' {
  interface ProjectStore {
    registry?: {
      projectId?: string
      'publish-project-robot'?: SwitchParam
    }
  }
  interface Config {
    registry?: {
      'publish-project-robot'?: SwitchParam
    }
  }
}
