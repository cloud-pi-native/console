import { CoreV1Api, KubeConfig, PatchUtils } from '@kubernetes/client-node'
import { type ClusterObject } from '@dso-console/hooks'

export const patchOptions = { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }

export const createCoreV1Api = (cluster: ClusterObject) => {
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
