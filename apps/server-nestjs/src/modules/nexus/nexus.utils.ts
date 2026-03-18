import { randomBytes } from 'node:crypto'
import type { ProjectWithDetails } from './nexus-datastore.service'

const trailingSlashesRegex = /\/+$/u

export function removeTrailingSlash(value: string) {
  return value.replace(trailingSlashesRegex, '')
}

export function getPluginConfig(project: ProjectWithDetails, key: string) {
  return project.plugins?.find(p => p.key === key)?.value
}

export type WritePolicy = 'allow' | 'allow_once' | 'deny' | 'replication_only'

export const writePolicies: WritePolicy[] = ['allow', 'allow_once', 'deny', 'replication_only']

export function assertWritePolicy(value: string): asserts value is WritePolicy {
  if (!writePolicies.includes(value as WritePolicy)) {
    throw new Error(`Invalid writePolicy: ${value}`)
  }
}

export function generateRandomPassword(length: number) {
  const raw = randomBytes(Math.ceil(length * 0.75)).toString('base64url')
  return raw.slice(0, length)
}

export function getProjectVaultPath(projectRootPath: string | undefined, projectSlug: string, relativePath: string) {
  const normalized = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath
  return projectRootPath
    ? `${projectRootPath}/${projectSlug}/${normalized}`
    : `${projectSlug}/${normalized}`
}

export interface MavenRepoNames {
  hosted: Array<{ repo: string, privilege: string }>
  group: { repo: string, privilege: string }
}

export interface NpmRepoNames {
  hosted: Array<{ repo: string, privilege: string }>
  group: { repo: string, privilege: string }
}

export function generateMavenRepoNames(projectSlug: string): MavenRepoNames {
  return {
    hosted: [
      {
        repo: `${projectSlug}-repository-release`,
        privilege: `${projectSlug}-privilege-release`,
      },
      {
        repo: `${projectSlug}-repository-snapshot`,
        privilege: `${projectSlug}-privilege-snapshot`,
      },
    ],
    group: {
      repo: `${projectSlug}-repository-group`,
      privilege: `${projectSlug}-privilege-group`,
    },
  }
}

export function generateNpmRepoNames(projectSlug: string): NpmRepoNames {
  return {
    hosted: [
      {
        repo: `${projectSlug}-npm`,
        privilege: `${projectSlug}-npm-privilege`,
      },
    ],
    group: {
      repo: `${projectSlug}-npm-group`,
      privilege: `${projectSlug}-npm-group-privilege`,
    },
  }
}
