import type { ProjectWithDetails } from './registry-datastore.service'
import type { RegistryResponse } from './registry-http-client.service'
import { MonitorStatus, removeTrailingSlash } from '@cpn-console/shared'
import { HttpStatus } from '@nestjs/common'
import z from 'zod'

// Harbor signals an "already exists" race either as a plain HTTP 409
// (project create) or as a 400 whose body carries code CONFLICT.
const harborErrorBodySchema = z.object({
  errors: z.array(z.object({
    code: z.string(),
  })),
})

export function isRegistryConflict(response: RegistryResponse<unknown>): boolean {
  if (response.status === HttpStatus.CONFLICT) return true
  if (response.status !== HttpStatus.BAD_REQUEST) return false
  const parsed = harborErrorBodySchema.safeParse(response.data)
  return parsed.success && parsed.data.errors.some(error => error.code === 'CONFLICT')
}

// Idempotent write: on a race collision, reconciles via `reload` and returns
// its result; a collision reload that finds nothing rethrows. The created
// response carries no usable body — reload always provides the fresh object.
export async function ensure<T>({
  create,
  reload,
  onCollision,
}: {
  create: () => Promise<RegistryResponse>
  reload: () => Promise<T | undefined>
  onCollision?: (response: RegistryResponse) => void
}): Promise<T | undefined> {
  const created = await create()
  if (created.status >= HttpStatus.BAD_REQUEST) {
    if (!isRegistryConflict(created)) {
      throw new Error(`Harbor request failed (${created.status})`)
    }
    onCollision?.(created)
    const existing = await reload()
    if (existing !== undefined) return existing
    throw new Error(`Harbor request failed (${created.status})`)
  }
  return reload()
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

export interface RegistryProbeOutcome {
  status: MonitorStatus
  message: string
  cause?: unknown
}

// Legacy harbor monitor reads /health, not /ping, to split degraded from failed.
const MONITOR_ERROR_MESSAGE = 'Erreur lors la requête'

const CORE_COMPONENTS = new Set(['core', 'database', 'portal', 'registry', 'registryctl'])

const harborHealthBodySchema = z.object({
  status: z.string(),
  components: z.array(z.object({
    name: z.string(),
    status: z.string(),
  })).optional(),
})

export async function monitorHarborHealth(fetchHealth: () => Promise<Response>): Promise<RegistryProbeOutcome> {
  try {
    const response = await fetchHealth()
    if (response.status !== HttpStatus.OK) return { status: MonitorStatus.ERROR, message: 'Fatal Error' }

    const parsed = harborHealthBodySchema.safeParse(await response.json())
    if (!parsed.success) return { status: MonitorStatus.UNKNOW, message: MONITOR_ERROR_MESSAGE }
    if (parsed.data.status === 'healthy') return { status: MonitorStatus.OK, message: MonitorStatus.OK }

    const failedCoreComponent = parsed.data.components?.some(component =>
      component.status === 'unhealthy'
      && CORE_COMPONENTS.has(component.name),
    )
    if (failedCoreComponent) return { status: MonitorStatus.ERROR, message: 'Service en erreur' }
    return { status: MonitorStatus.WARNING, message: 'Service dégradé' }
  } catch (error) {
    return { status: MonitorStatus.UNKNOW, message: MONITOR_ERROR_MESSAGE, cause: error }
  }
}
