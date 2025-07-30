import type { Plugin } from '@cpn-console/hooks'
import { createDsoProject, deleteDsoProject, getProjectSecrets } from './functions'
import infos from './infos'
import monitor from './monitor'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    upsertProject: { steps: { post: createDsoProject } },
    deleteProject: { steps: { main: deleteDsoProject } },
    getProjectSecrets: { steps: { main: getProjectSecrets } },
  },
  monitor,
}
