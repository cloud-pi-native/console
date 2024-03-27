import { type Plugin } from '@cpn-console/hooks'
// import { deleteEnv, deleteRepo, newEnv, newRepo } from './functions.js'
// import { createCluster, deleteCluster, updateCluster } from './cluster.js'
import infos from './infos.js'
import monitor from './monitor.js'
import { deleteProject, upsertProject } from './functions.js'
import { fixLabels } from './label-fix.js'
import { upsertCluster, deleteCluster } from './cluster.js'

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
