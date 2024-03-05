import type { Plugin } from '@cpn-console/hooks'
import { createDsoProject, deleteDsoProject, getProjectSecrets } from './functions.js'
import infos from './infos.js'
import monitor from './monitor.js'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    upsertProject: { steps: { post: createDsoProject } },
    deleteProject: { steps: { main: deleteDsoProject } },
    getProjectSecrets: { steps: { main: getProjectSecrets } },
  },
  monitor,
}
