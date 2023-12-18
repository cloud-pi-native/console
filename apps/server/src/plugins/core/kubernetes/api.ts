import { ClusterMix } from '@/types'
import { CoreV1Api, KubeConfig, PatchUtils } from '@kubernetes/client-node'
import { SensitiveClusterModel } from '@dso-console/shared'

export const patchOptions = { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }

export const createCoreV1Api = (cluster: ClusterMix & { cluster: Required<ClusterMix['cluster']> }) => {
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
  kc.loadFromClusterAndUser({ ...clusterConfig, name: 'don\'t matter' }, userConfig)
  return kc.makeApiClient(CoreV1Api)
}

export const createCoreV1Apis = (clusters: SensitiveClusterModel[]) => {
  return clusters.map(createCoreV1Api)
}
