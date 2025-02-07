import type { DeclareModuleGenerator, Plugin } from '@cpn-console/hooks'
import { createNexusProject, deleteNexusProject, getSecrets } from './project.js'
import infos from './infos.js'
import monitor from './monitor.js'
import { startTracker } from './tracker.js'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    upsertProject: { steps: { main: createNexusProject } },
    deleteProject: { steps: { main: deleteNexusProject } },
    getProjectSecrets: { steps: { main: getSecrets } },
  },
  monitor,
  start: startTracker,
}

declare module '@cpn-console/hooks' {
  interface ProjectStore extends DeclareModuleGenerator<typeof infos, 'project'> {}
  interface Config extends DeclareModuleGenerator<typeof infos, 'global'> {}
}
