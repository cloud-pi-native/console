import type { DeclareModuleGenerator, Plugin } from '@cpn-console/hooks'
import infos from './infos'
import monitor from './monitor'
import { deleteProject, upsertProject } from './functions'
import { deleteCluster, upsertCluster } from './cluster'
import { upsertZone } from './zone'

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
