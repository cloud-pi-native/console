import type { DeclareModuleGenerator, Plugin } from '@cpn-console/hooks'
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

declare module '@cpn-console/hooks' {
  interface ProjectStore extends DeclareModuleGenerator<typeof infos, 'project'> {}
  interface Config extends DeclareModuleGenerator<typeof infos, 'global'> {}
}
