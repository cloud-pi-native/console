import type { Plugin } from '@cpn-console/hooks'
import { createNexusProject, deleteNexusProject } from './project.js'
import infos from './infos.js'
import monitor from './monitor.js'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    createProject: { steps: { main: createNexusProject } },
    archiveProject: { steps: { main: deleteNexusProject } },
  },
  monitor,
}
