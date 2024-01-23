import { PatchUtils } from '@kubernetes/client-node'
import { deleteEnv, deleteRepo, newEnv, newRepo } from './functions.js'
import { type Plugin } from '@dso-console/hooks'
import { createCluster, deleteCluster, updateCluster } from './cluster.js'
import infos from './infos.js'
import monitor from './monitor.js'
export const patchOptions = { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }

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
