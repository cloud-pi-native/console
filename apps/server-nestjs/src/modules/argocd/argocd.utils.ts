import type { Kubeconfig } from '@cpn-console/shared'
import { stringify } from 'yaml'

export function generateClusterTlsClientConfig(kubeconfig: Kubeconfig) {
  return {
    ...kubeconfig.user.username && { username: kubeconfig.user.username },
    ...kubeconfig.user.password && { password: kubeconfig.user.password },
    ...kubeconfig.user.token && { bearerToken: kubeconfig.user.token },
    tlsClientConfig: {
      ...kubeconfig.user.keyData && { keyData: kubeconfig.user.keyData },
      ...kubeconfig.user.certData && { certData: kubeconfig.user.certData },
      ...kubeconfig.cluster.caData && !kubeconfig.cluster.skipTLSVerify && { caData: kubeconfig.cluster.caData },
      ...kubeconfig.cluster.skipTLSVerify && { insecure: kubeconfig.cluster.skipTLSVerify },
      serverName: kubeconfig.cluster.tlsServerName,
    },
  }
}

export function generateZoneVaultValues(vaultUrl: string, zoneSlug: string, roleId: string | undefined, secretId: string | undefined) {
  return {
    url: vaultUrl,
    kvName: `zone-${zoneSlug}`,
    roleId: roleId ?? 'none',
    secretId: secretId ?? 'none',
  }
}

export function generateClusterSecretData(cluster: { label: string, clusterResources: boolean }, kubeconfig: Kubeconfig) {
  return {
    name: cluster.label,
    clusterResources: String(cluster.clusterResources),
    server: kubeconfig.cluster.server,
    config: stringify(generateClusterTlsClientConfig(kubeconfig)),
  }
}
