const trailingSlashesRegex = /\/+$/u
const protocolPrefixRegex = /^https?:\/\//u

export function removeTrailingSlash(value: string) {
  return value.replace(trailingSlashesRegex, '')
}

export function getHostFromUrl(url: string) {
  return removeTrailingSlash(url).replace(protocolPrefixRegex, '').split('/')[0]
}

export function encodeBasicAuth(username: string, password: string) {
  return Buffer.from(`${username}:${password}`).toString('base64')
}

export interface VaultRobotSecret {
  DOCKER_CONFIG: string
  HOST: string
  TOKEN: string
  USERNAME: string
}

export function toVaultRobotSecret(host: string, robotName: string, robotSecret: string): VaultRobotSecret {
  const auth = `${robotName}:${robotSecret}`
  const b64auth = Buffer.from(auth).toString('base64')
  return {
    DOCKER_CONFIG: JSON.stringify({
      auths: {
        [host]: {
          auth: b64auth,
          email: '',
        },
      },
    }),
    HOST: host,
    TOKEN: robotSecret,
    USERNAME: robotName,
  }
}

export function getProjectVaultPath(projectRootPath: string | undefined, projectSlug: string, relativePath: string) {
  const normalized = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath
  return projectRootPath
    ? `${projectRootPath}/${projectSlug}/${normalized}`
    : `${projectSlug}/${normalized}`
}
