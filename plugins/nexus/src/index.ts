import type { Plugin } from '@cpn-console/hooks'
import { createNexusProject, deleteNexusProject, getSecrets } from './project'
import infos from './infos'
import monitor from './monitor'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    upsertProject: { steps: { main: createNexusProject } },
    deleteProject: { steps: { main: deleteNexusProject } },
    getProjectSecrets: { steps: { main: getSecrets } },
  },
  monitor,
}
