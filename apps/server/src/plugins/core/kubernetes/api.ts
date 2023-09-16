import { ClusterMix } from '@/types'
import { CoreV1Api, KubeConfig, PatchUtils } from '@kubernetes/client-node'
import { ClusterModel } from '@dso-console/shared'

export const patchOptions = { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }

export const createCoreV1Api = (cluster: ClusterMix) => {
  const kc = new KubeConfig()
  const clusterConfig = {
    ...cluster.cluster,
    skipTLSVerify: cluster.cluster.skipTLSVerify ?? false,
  }
  const userConfig = {
    ...cluster.user,
    name: cluster.id,
  }
  if (cluster.cluster.skipTLSVerify) delete clusterConfig.caData
  kc.loadFromClusterAndUser(clusterConfig, userConfig)
  return kc.makeApiClient(CoreV1Api)
}

export const createCoreV1Apis = (clusters: ClusterModel[]) => {
  return clusters.map(createCoreV1Api)
}

const localKc = new KubeConfig()
localKc.loadFromCluster()
export const localClient = localKc.makeApiClient(CoreV1Api)
