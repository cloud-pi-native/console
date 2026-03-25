import type { DeclareModuleGenerator, Plugin } from '@cpn-console/hooks'
import infos from './infos.ts'
import monitor from './monitor.ts'
import { createNexusProject, deleteNexusProject, getSecrets } from './project.ts'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    upsertProject: { steps: { main: createNexusProject } },
    deleteProject: { steps: { main: deleteNexusProject } },
    getProjectSecrets: { steps: { main: getSecrets } },
  },
  monitor,
}

declare module '@cpn-console/hooks' {
  interface ProjectStore extends DeclareModuleGenerator<typeof infos, 'project'> {}
  interface Config extends DeclareModuleGenerator<typeof infos, 'global'> {}
}
