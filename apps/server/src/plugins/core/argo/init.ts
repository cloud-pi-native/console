import { KubeConfig, CoreV1Api, CustomObjectsApi, PatchUtils } from '@kubernetes/client-node'
import { addCluster, deleteEnv, deleteRepo, newEnv, newRepo, removeCluster } from './index.js'
import { kubeconfigPath, kubeconfigCtx } from '@/utils/env.js'
import { RegisterFn } from '@/plugins/index.js'
import { createCluster, deleteCluster } from './cluster.js'
export const patchOptions = { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }

const kc = new KubeConfig()
if (kubeconfigPath) {
  kc.loadFromFile(kubeconfigPath)
  if (kubeconfigCtx) {
    kc.setCurrentContext(kubeconfigCtx)
  }
} else {
  kc.loadFromCluster()
}

export const k8sApi = kc.makeApiClient(CoreV1Api)
export const customK8sApi = kc.makeApiClient(CustomObjectsApi)

export const init = (register: RegisterFn) => {
  register('argo', {
    // Envs
    // @ts-ignore
    initializeEnvironment: { post: newEnv },
    // @ts-ignore
    deleteEnvironment: { main: deleteEnv },
    // @ts-ignore
    addEnvironmentCluster: { main: addCluster },
    // @ts-ignore
    removeEnvironmentCluster: { main: removeCluster },
    // Repos
    // @ts-ignore
    createRepository: { main: newRepo },
    // @ts-ignore
    deleteRepository: { main: deleteRepo },
    // clusters
    // @ts-ignore
    createCluster: { main: createCluster },
    // @ts-ignore
    deleteCluster: { main: deleteCluster },
  })
}
