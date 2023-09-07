import { ClusterModel } from '@dso-console/shared'
import type { V1Secret } from '@kubernetes/client-node'
import { StepCall } from '@/plugins/hooks/hook.js'
import { CreateClusterExecArgs, DeleteClusterExecArgs } from '@/plugins/hooks/index.js'
import { k8sApi } from './init.js'
import { argoNamespace } from '@/utils/env.js'

export const createCluster: StepCall<CreateClusterExecArgs> = async (payload) => {
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
      status: {
        result: 'KO',
        message: 'Failed create/update cluster secret',
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteCluster: StepCall<DeleteClusterExecArgs> = async (payload) => {
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
      status: {
        result: 'KO',
        message: 'Failed to delete cluster secret',
      },
      error: JSON.stringify(error),
    }
  }
}

// ...désolé
const convertConfig = (cluster: ClusterModel) => ({
  ...cluster.user?.username && { username: cluster.user?.username },
  ...cluster.user?.password && { password: cluster.user?.password },
  ...cluster.user?.token && { bearerToken: cluster.user?.token },
  tlsClientConfig: {
    ...cluster.user?.keyData && { keyData: cluster.user?.keyData },
    ...cluster.user?.certData && { certData: cluster.user?.certData },
    ...cluster.cluster?.caData && { caData: cluster.cluster?.caData },
    serverName: cluster.cluster.tlsServerName,
  },
})

const convertClusterToSecret = (cluster: ClusterModel): V1Secret => {
  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: cluster.secretName,
      labels: { 'argocd.argoproj.io/secret-type': 'cluster' },
    },
    data: {
      name: btoa(cluster.label),
      clusterResources: btoa(cluster.clusterResources.toString()),
      server: btoa(cluster.cluster.server),
      config: btoa(JSON.stringify(convertConfig(cluster))),
    },
  }
}

export const createClusterSecret = async (cluster: ClusterModel) => {
  try {
    await k8sApi.readNamespacedSecret(cluster.secretName, argoNamespace)
    await k8sApi.replaceNamespacedSecret(cluster.secretName, argoNamespace, convertClusterToSecret(cluster))
  } catch (error) {
    if (error.response.statusCode !== 404) throw error
    await k8sApi.createNamespacedSecret(argoNamespace, convertClusterToSecret(cluster))
  }
}

export const deleteClusterSecret = async (secretName: ClusterModel['secretName']) => {
  try {
    await k8sApi.deleteNamespacedSecret(secretName, argoNamespace)
  } catch (error) {
    if (error.response.statusCode !== 404) throw error
  }
}
