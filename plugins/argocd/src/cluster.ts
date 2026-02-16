import { type ClusterObject, type StepCall, parseError } from '@cpn-console/hooks'
import { updateZoneValues } from './utils.js'

export const upsertCluster: StepCall<ClusterObject> = async (payload) => {
  try {
    const cluster = payload.args
    const { vault } = payload.apis
    const clusterData = {
      name: cluster.label,
      clusterResources: cluster.clusterResources.toString(),
      server: cluster.cluster.server,
      config: JSON.stringify(convertConfig(cluster)),
    }
    await vault.upsert()
    await vault.write(clusterData, `clusters/cluster-${cluster.label}/argocd-cluster-secret`)
    await updateZoneValues(cluster.zone, payload.apis)
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
    await payload.apis.vault.destroy(`clusters/cluster-${payload.args.label}/argocd-cluster-secret`)
    await updateZoneValues(payload.args.zone, payload.apis)
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
function convertConfig(cluster: ClusterObject) {
  return {
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
  }
}
