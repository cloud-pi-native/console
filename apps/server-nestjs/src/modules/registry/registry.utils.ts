const trailingSlashesRegex = /\/+$/u
const protocolPrefixRegex = /^https?:\/\//u
const parseBytesRegex = /^(\d+(?:\.\d+)?)(\s*(kb|mb|gb|tb|[kmgtb]))?$/u

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

export function parseBytes(input: string | number | undefined) {
  if (input === undefined || input === null) return undefined
  if (typeof input === 'number' && Number.isFinite(input)) return input
  const raw = String(input).trim().toLowerCase()
  if (!raw) return undefined
  const match = raw.match(parseBytesRegex)
  if (!match) {
    return Number.isFinite(Number(raw)) ? Number(raw) : undefined
  }
  const value = Number(match[1])
  const unit = (match[3] ?? 'b').toLowerCase()
  const pow
    = unit === 'kb' || unit === 'k'
      ? 1
      : unit === 'mb' || unit === 'm'
        ? 2
        : unit === 'gb' || unit === 'g'
          ? 3
          : unit === 'tb' || unit === 't'
            ? 4
            : 0
  return Math.round(value * 1024 ** pow)
}
