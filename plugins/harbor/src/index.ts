import type { Plugin } from '@cpn-console/hooks'
import { createDsoProject, archiveDsoProject, getProjectSecrets } from './functions.js'
import infos from './infos.js'
import monitor from './monitor.js'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    createProject: { steps: { post: createDsoProject } },
    archiveProject: { steps: { main: archiveDsoProject } },
    getProjectSecrets: { steps: { main: getProjectSecrets } },
  },
  monitor,
}
