import type { Plugin } from '@cpn-console/hooks'
import infos from './infos.js'
import monitor from './monitor.js'
import { createNexusProject, deleteNexusProject } from './project.js'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    upsertProject: { steps: { main: createNexusProject } },
    deleteProject: { steps: { main: deleteNexusProject } },
  },
  monitor,
}
