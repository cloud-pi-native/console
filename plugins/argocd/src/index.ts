import type { DeclareModuleGenerator, Plugin } from '@cpn-console/hooks'
import { deleteCluster, upsertCluster } from './cluster.js'
import { deleteProject, upsertProject } from './functions.js'
import infos from './infos.js'
import { fixLabels } from './label-fix.js'
import monitor from './monitor.js'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    upsertProject: {
      steps: {
        main: upsertProject,
      },
    },
    deleteProject: {
      steps: {
        main: deleteProject,
      },
    },
    upsertCluster: {
      steps: {
        main: upsertCluster,
      },
    },
    deleteCluster: {
      steps: {
        main: deleteCluster,
      },
    },
  },
  monitor,
  start: fixLabels,
}

declare module '@cpn-console/hooks' {
  interface ProjectStore extends DeclareModuleGenerator<typeof infos, 'project'> {}
  interface Config extends DeclareModuleGenerator<typeof infos, 'global'> {}
}
