import { KubeConfig, CoreV1Api, CustomObjectsApi, PatchUtils } from '@kubernetes/client-node'
import { deleteEnv, deleteRepo, newEnv, newRepo } from './index.js'
import { kubeconfigPath, kubeconfigCtx } from '../../../utils/env.js'
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

export const init = (register) => {
  register('argo', {
    initializeEnvironment: { post: newEnv },
    deleteEnvironment: { main: deleteEnv },
    createRepository: { main: newRepo },
    deleteRepository: { main: deleteRepo },
  })
}
