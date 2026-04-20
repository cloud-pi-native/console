import type { ProjectWithDetails } from './nexus-datastore.service'
import { randomBytes } from 'node:crypto'

const trailingSlashesRegex = /\/+$/u

export function removeTrailingSlash(value: string) {
  return value.replace(trailingSlashesRegex, '')
}

export function getPluginConfig(project: ProjectWithDetails, key: string) {
  return project.plugins?.find(p => p.key === key)?.value
}

export function generateRandomPassword(length: number) {
  const raw = randomBytes(Math.ceil(length * 0.75)).toString('base64url')
  return raw.slice(0, length)
}

export function getProjectVaultPath(projectRootDir: string | undefined, projectSlug: string, relativePath: string) {
  const normalized = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath
  return projectRootDir
    ? `${projectRootDir}/${projectSlug}/${normalized}`
    : `${projectSlug}/${normalized}`
}

export type MavenHostedRepoKind = 'release' | 'snapshot'

export function generateMavenHostedRepoName(project: ProjectWithDetails, kind: MavenHostedRepoKind) {
  return `${project.slug}-repository-${kind}`
}

export function generateNpmHostedRepoName(project: ProjectWithDetails) {
  return `${project.slug}-npm`
}
