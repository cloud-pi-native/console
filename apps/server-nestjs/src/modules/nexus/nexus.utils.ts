import type { ProjectWithDetails } from './nexus-datastore.service'
import { randomBytes } from 'node:crypto'
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
