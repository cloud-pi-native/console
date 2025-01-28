import type { AppRoleCredentials } from './class.js'

export function generateVsoVaultConnection(creds: AppRoleCredentials) {
  return {
    apiVersion: 'secrets.hashicorp.com/v1beta1',
    kind: 'VaultConnection',
    metadata: {
      name: 'default',
      labels: {
        'app.kubernetes.io/managed-by': 'dso-console',
      },
    },
    spec: {
      address: creds.url,
    },
  }
}

export function generateVsoSecret(creds: AppRoleCredentials) {
  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: 'vso-approle',
      labels: {
        'app.kubernetes.io/managed-by': 'dso-console',
      },
    },
    stringData: {
      id: creds.secretId,
    },
  }
}
export function generateVaultAuth(creds: AppRoleCredentials, vaultConnectionRef: string | null = null) {
  return {
    apiVersion: 'secrets.hashicorp.com/v1beta1',
    kind: 'VaultAuth',
    metadata: {
      name: 'vault-auth',
      labels: {
        'app.kubernetes.io/managed-by': 'dso-console',
      },
    },
    spec: {
      vaultConnectionRef,
      method: 'appRole',
      mount: 'approle',
      appRole: {
        roleId: creds.roleId,
        secretRef: 'vso-approle',
      },
      allowedNamespaces: null,
    },
  }
}
