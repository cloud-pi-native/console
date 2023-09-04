import { ClusterMix } from '@/types'
import { CoreV1Api, KubeConfig, PatchUtils } from '@kubernetes/client-node'
import { ClusterModel } from '@dso-console/shared'

export const patchOptions = { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }

export const createCoreV1Api = (cluster: ClusterMix) => {
  const kc = new KubeConfig()
  kc.loadFromClusterAndUser({
    // @ts-ignore mix Clusters types
    ...cluster.cluster,
    skipTLSVerify: true,
  }, {
    // @ts-ignore mix Clusters types
    ...cluster.user,
    name: cluster.id,
  })
  return kc.makeApiClient(CoreV1Api)
}

export const createCoreV1Apis = (clusters: ClusterModel[]) => {
  return clusters.map(createCoreV1Api)
}
