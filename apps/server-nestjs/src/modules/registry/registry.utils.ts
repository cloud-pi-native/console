import type { ProjectWithDetails } from './registry-datastore.service'
import type { RegistryResponse } from './registry-http-client.service'
import { removeTrailingSlash } from '@cpn-console/shared'
import { HttpStatus } from '@nestjs/common'

// Whether a Harbor response signals an entity already existing (race collision):
// a 409, or a 400 whose structured body carries code "CONFLICT" — Harbor
// reports most "already exists" races as 400:
// {"errors":[{"code":"CONFLICT","message":"... project already exists"}]}
export function isRegistryConflict(response: RegistryResponse<unknown>): boolean {
  if (response.status === HttpStatus.CONFLICT) return true
  if (response.status !== HttpStatus.BAD_REQUEST) return false
  const body = response.data as { errors?: Array<{ code?: unknown }> } | null
  if (!Array.isArray(body?.errors)) return false
  return body.errors.some(error => typeof error?.code === 'string' && error.code.toUpperCase() === 'CONFLICT')
}

// Runs an idempotent write: tries `create`, and on a Harbor race collision
// (409, or 400 with code CONFLICT) reconciles via `reload` and returns its
// result instead of failing. `onCollision` is invoked once when a collision is
// detected. Resolve semantics: a success carrying a body resolves with it
// (robots); a success with an empty body (projects, members, retentions)
// resolves with null — the caller fetches when it needs the entity. If a
// collision reload finds nothing, the error is rethrown so genuine failures
// are not swallowed.
export async function ensure<T>({
  create,
  reload,
  onCollision,
}: {
  create: () => Promise<RegistryResponse<T>>
  reload: () => Promise<T | null | undefined>
  onCollision?: (response: RegistryResponse<T>) => void
}): Promise<T | null> {
  const created = await create()
  if (created.status >= HttpStatus.BAD_REQUEST) {
    if (!isRegistryConflict(created)) {
      throw new Error(`Harbor request failed (${created.status})`)
    }
    onCollision?.(created)
    const existing = await reload()
    if (existing !== null && existing !== undefined) return existing
    throw new Error(`Harbor request failed (${created.status})`)
  }
  if (created.data !== null && created.data !== undefined && created.data !== ''
    && !(typeof created.data === 'object' && !Array.isArray(created.data) && Object.keys(created.data).length === 0)) {
    return created.data
  }
  return null
}

export function createProjectSlugCacheKey(projectId: string) {
  return `registry:project-slug:${projectId}`
}

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
