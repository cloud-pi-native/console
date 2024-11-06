import type { DeclareModuleGenerator, Plugin } from '@cpn-console/hooks'
import infos from './infos.js'
import monitor from './monitor.js'
import { deleteProject, upsertProject } from './functions.js'
import { fixLabels } from './label-fix.js'
import { deleteCluster, upsertCluster } from './cluster.js'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    upsertProject: {
      steps: {
        post: upsertProject,
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
