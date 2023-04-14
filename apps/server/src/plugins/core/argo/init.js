import k8s from '@kubernetes/client-node'
import { deleteEnv, deleteRepo, newEnv, newRepo } from './index.js'
import { kubeconfigPath, kubeconfigCtx } from '../../../utils/env.js'

const kc = new k8s.KubeConfig()
if (kubeconfigPath) kc.loadFromFile(kubeconfigPath)
if (kubeconfigCtx) kc.setCurrentContext(kubeconfigCtx)

export const k8sApi = kc.makeApiClient(k8s.CoreV1Api)
export const customK8sApi = kc.makeApiClient(k8s.CustomObjectsApi)

export const init = (register) => {
  register('argo', 'initializeEnvironment', newEnv, 'post')
  register('argo', 'deleteEnvironment', deleteEnv, 'main')
  register('argo', 'createRepository', newRepo, 'main')
  register('argo', 'deleteRepository', deleteRepo, 'main')
}