import { ApisApi, CoreV1Api, KubeConfig } from '@kubernetes/client-node'
import type { ClusterObject } from '@cpn-console/hooks'
import { inClusterLabel } from '@cpn-console/shared'
import { AnyObjectsApi } from './customApiClass.js'

export function createCoreV1Api(cluster: ClusterObject) {
  const kc = makeClusterApi(cluster)
  return kc ? kc.makeApiClient(CoreV1Api) : undefined
}

export function createApisApi(cluster: ClusterObject) {
  const kc = makeClusterApi(cluster)
  return kc ? kc.makeApiClient(ApisApi) : undefined
}

export function createCoreV1Apis(clusters: ClusterObject[]) {
  return clusters.map(createCoreV1Api)
}

export function createCustomObjectApi(cluster: ClusterObject) {
  const kc = makeClusterApi(cluster)
  return kc ? kc.makeApiClient(AnyObjectsApi) : undefined
}

function makeClusterApi(cluster: ClusterObject): KubeConfig | undefined {
  const kc = new KubeConfig()
  if (cluster.label === inClusterLabel) {
    kc.loadFromCluster()
    return kc
  }
  if (!cluster.user.keyData && !cluster.user.token) {
    // Special case: disable direct calls to the cluster
    return undefined
  }
  const clusterConfig = {
    ...cluster.cluster,
    skipTLSVerify: cluster.cluster.skipTLSVerify ?? false,
    name: 'You should pass !',
  }
  const userConfig = {
    ...cluster.user,
    name: cluster.id,
  }
  if (cluster.cluster.skipTLSVerify) {
    delete clusterConfig.caData
  }
  kc.loadFromClusterAndUser(clusterConfig, userConfig)
  return kc
}
