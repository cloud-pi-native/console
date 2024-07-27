import type { V1Secret } from '@kubernetes/client-node'
import { type StepCall, type ClusterObject, parseError } from '@cpn-console/hooks'
import { getConfig, getK8sApi } from './utils.js'

export const upsertCluster: StepCall<ClusterObject> = async (payload) => {
  try {
    const cluster = payload.args
    await createClusterSecret(cluster)
    return {
      status: {
        result: 'OK',
        message: 'Cluster secret created/updated',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed create/update cluster secret',
      },
    }
  }
}

export const deleteCluster: StepCall<ClusterObject> = async (payload) => {
  try {
    const secretName = payload.args.secretName
    await deleteClusterSecret(secretName)
    return {
      status: {
        result: 'OK',
        message: 'Cluster secret deleted',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed to delete cluster secret',
      },
    }
  }
}

// ...désolé
const convertConfig = (cluster: ClusterObject) => ({
  ...cluster.user?.username && { username: cluster.user?.username },
  ...cluster.user?.password && { password: cluster.user?.password },
  ...cluster.user?.token && { bearerToken: cluster.user?.token },
  tlsClientConfig: {
    ...cluster.user?.keyData && { keyData: cluster.user?.keyData },
    ...cluster.user?.certData && { certData: cluster.user?.certData },
    ...(cluster.cluster?.caData && !cluster.cluster?.skipTLSVerify) && { caData: cluster.cluster?.caData },
    ...cluster.cluster?.skipTLSVerify && { insecure: cluster.cluster.skipTLSVerify },
    serverName: cluster.cluster.tlsServerName,
  },
})

const convertClusterToSecret = (cluster: ClusterObject): V1Secret => {
  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: cluster.secretName,
      labels: {
        'argocd.argoproj.io/secret-type': 'cluster',
        'dso/zone': cluster.zone.slug,
      },
    },
    data: {
      name: btoa(cluster.label),
      clusterResources: btoa(cluster.clusterResources.toString()),
      server: btoa(cluster.cluster.server),
      config: btoa(JSON.stringify(convertConfig(cluster))),
    },
  }
}

const createClusterSecret = async (cluster: ClusterObject) => {
  const k8sApi = getK8sApi()
  try {
    await k8sApi.readNamespacedSecret(cluster.secretName, getConfig().namespace)
    await k8sApi.replaceNamespacedSecret(cluster.secretName, getConfig().namespace, convertClusterToSecret(cluster))
  } catch (error) {
    // @ts-ignore add control on error
    if (error?.response?.statusCode !== 404) throw error
    await k8sApi.createNamespacedSecret(getConfig().namespace, convertClusterToSecret(cluster))
  }
}

export const deleteClusterSecret = async (secretName: ClusterObject['secretName']) => {
  const k8sApi = getK8sApi()
  try {
    await k8sApi.deleteNamespacedSecret(secretName, getConfig().namespace)
  } catch (error) {
    // @ts-ignore add control on error
    if (error.response.statusCode !== 404) throw error
  }
}
