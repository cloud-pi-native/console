import { KubeConfig, CoreV1Api } from '@kubernetes/client-node'
import { kubeconfigPath, kubeconfigCtx } from '../../../utils/env.js'
import { checkInitializeEnvironment, createKubeNamespace, createKubeSecret, deleteKubeNamespace } from './index.js'

const kc = new KubeConfig()
if (kubeconfigPath) {
  kc.loadFromFile(kubeconfigPath)
  if (kubeconfigCtx) {
    kc.setCurrentContext(kubeconfigCtx)
  }
} else {
  kc.loadFromCluster()
}

const k8sApi = kc.makeApiClient(CoreV1Api)

export default k8sApi

export const init = (register) => {
  register('kubernetes', 'initializeEnvironment', checkInitializeEnvironment, 'check') // TODO implement check in controller
  register('kubernetes', 'initializeEnvironment', createKubeNamespace, 'main')
  register('kubernetes', 'initializeEnvironment', createKubeSecret, 'post')
  register('kubernetes', 'deleteEnvironment', deleteKubeNamespace, 'main')
}
