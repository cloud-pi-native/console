import { type Plugin } from '@cpn-console/hooks'
import { deleteEnv, deleteRepo, newEnv, newRepo } from './functions.js'
import { createCluster, deleteCluster, updateCluster } from './cluster.js'
import infos from './infos.js'
import monitor from './monitor.js'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    // Envs
    initializeEnvironment: { steps: { post: newEnv } },
    deleteEnvironment: { steps: { main: deleteEnv } },
    // Repos
    createRepository: { steps: { main: newRepo } },
    deleteRepository: { steps: { main: deleteRepo } },
    // clusters
    createCluster: { steps: { main: createCluster } },
    deleteCluster: { steps: { main: deleteCluster } },
    updateCluster: { steps: { main: updateCluster } },
  },
  monitor,
}
