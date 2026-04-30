import type { ProjectWithDetails } from './registry-datastore.service.js'
import { removeTrailingSlash } from '@cpn-console/shared'

const protocolPrefixRegex = /^https?:\/\//u
const parseBytesRegex = /^(\d+(?:\.\d+)?)(?:\s*(kb|mb|gb|tb|[kmgtb]))?$/u

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

export function generateVaultRobotSecret(host: string, robotName: string, robotSecret: string): VaultRobotSecret {
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

export function getProjectVaultPath(project: ProjectWithDetails, projectRootDir: string | undefined, relativePath: string) {
  const normalized = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath
  return projectRootDir
    ? `${projectRootDir}/${project.slug}/${normalized}`
    : `${project.slug}/${normalized}`
}

export function parseBytes(input: string | number | undefined) {
  if (input === undefined || input === null) return undefined
  if (typeof input === 'number' && Number.isFinite(input)) return input
  const raw = String(input).trim().toLowerCase()
  if (!raw) return undefined
  const match = parseBytesRegex.exec(raw)
  if (!match) {
    return Number.isFinite(Number(raw)) ? Number(raw) : undefined
  }
  const value = Number(match[1])
  const unit = (match[2] ?? 'b').toLowerCase()
  const pow = parseUnit(unit)
  return Math.round(value * 1024 ** pow)
}

function parseUnit(unit: string) {
  switch (unit) {
    case 'kb':
    case 'k':
      return 1
    case 'mb':
    case 'm':
      return 2
    case 'gb':
    case 'g':
      return 3
    case 'tb':
    case 't':
      return 4
    default:
      return 0
  }
}
