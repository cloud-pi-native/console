import type { DeclareModuleGenerator, Plugin } from '@cpn-console/hooks'
import { deleteCluster, upsertCluster } from './cluster.ts'
import { deleteProject, upsertProject } from './functions.ts'
import infos from './infos.ts'
import monitor from './monitor.ts'
import { upsertZone } from './zone.ts'

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
    upsertZone: {
      steps: {
        main: upsertZone,
      },
    },
  },
  monitor,
}

declare module '@cpn-console/hooks' {
  interface ProjectStore extends DeclareModuleGenerator<typeof infos, 'project'> {}
  interface Config extends DeclareModuleGenerator<typeof infos, 'global'> {}
}
