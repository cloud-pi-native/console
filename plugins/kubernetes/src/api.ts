import { CoreV1Api, KubeConfig } from '@kubernetes/client-node'
import { type ClusterObject } from '@cpn-console/hooks'
import { AnyObjectsApi } from './customApiClass.js'

export const createCoreV1Api = (cluster: ClusterObject) => {
  if (!cluster.user.keyData) {
    // Special case: disable direct calls to the cluster
    console.log(`Direct kubernetes API calls are disabled for cluster ${cluster.label}`)
    return
  }
  const kc = new KubeConfig()
  const clusterConfig = {
    ...cluster.cluster,
    skipTLSVerify: cluster.cluster.skipTLSVerify ?? false,
    name: 'You should pass !',
  }
  const userConfig = {
    ...cluster.user,
    name: cluster.id,
  }
  if (cluster.cluster.skipTLSVerify) delete clusterConfig.caData
  kc.loadFromClusterAndUser(clusterConfig, userConfig)
  return kc.makeApiClient(CoreV1Api)
}

export const createCoreV1Apis = (clusters: ClusterObject[]) => {
  return clusters.map(createCoreV1Api)
}

export const createCustomObjectApi = (cluster: ClusterObject) => {
  const kc = new KubeConfig()
  const clusterConfig = {
    ...cluster.cluster,
    skipTLSVerify: cluster.cluster.skipTLSVerify ?? false,
    name: 'You should pass !',
  }
  const userConfig = {
    ...cluster.user,
    name: cluster.id,
  }
  if (cluster.cluster.skipTLSVerify) delete clusterConfig.caData
  kc.loadFromClusterAndUser(clusterConfig, userConfig)
  return kc.makeApiClient(AnyObjectsApi)
}
