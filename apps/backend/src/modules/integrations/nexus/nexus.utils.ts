import type { ProjectWithDetails } from './nexus-datastore.service'
import { randomBytes } from 'node:crypto'
import { HttpStatus } from '@nestjs/common'
import { NexusError } from './nexus-http-client.service'

export function getPluginConfig(project: ProjectWithDetails, key: string) {
  return project.plugins?.find(p => p.key === key)?.value
}

export function generateRandomPassword(length: number) {
  const raw = randomBytes(Math.ceil(length * 0.75)).toString('base64url')
  return raw.slice(0, length)
}

export function generateNexusCredPath(projectRootDir: string, projectSlug: string) {
  return `${projectRootDir}/${projectSlug}/NEXUS`
}

export type MavenHostedRepoKind = 'release' | 'snapshot'

export function generateMavenHostedRepoName(project: ProjectWithDetails, kind: MavenHostedRepoKind) {
  return `${project.slug}-repository-${kind}`
}

export function generateNpmHostedRepoName(project: ProjectWithDetails) {
  return `${project.slug}-npm`
}

export function isNexusNotFound(error: unknown): error is NexusError {
  return error instanceof NexusError && error.status === 404
}

// Whether a Nexus error signals an entity already existing (race collision):
// a 409 conflict, or a 4xx whose message mentions "already"/"exists"
// (Nexus reports some collisions as a generic Bad Request).
export function isNexusAlreadyExists(error: unknown): error is NexusError {
  if (!(error instanceof NexusError)) return false
  if (error.status === HttpStatus.CONFLICT) return true
  return error.status !== undefined && error.status >= 400 && error.status < 500 && /already|exists/i.test(error.message)
}

// Runs an idempotent write: tries `create`, and on a Nexus race collision
// reloads via `reload` and returns the existing entity instead of failing.
// `onCollision` is invoked once when a collision is detected. If the reload
// finds nothing, the original error is rethrown so genuine failures are not
// swallowed.
export async function ensure<T>({
  create,
  reload,
  onCollision,
}: {
  create: () => Promise<T>
  reload: () => Promise<T | undefined>
  onCollision?: (error: unknown) => void
}): Promise<T> {
  try {
    return await create()
  } catch (error) {
    if (isNexusAlreadyExists(error)) {
      onCollision?.(error)
      const existing = await reload()
      if (existing) return existing
    }
    throw error
  }
}
