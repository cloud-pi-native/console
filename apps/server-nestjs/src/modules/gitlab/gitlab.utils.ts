import type { ProjectWithDetails } from './gitlab-datastore.service'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { AccessLevel } from '@gitbeaker/core'

export type ProjectAccessLevel = Exclude<AccessLevel, (typeof AccessLevel)['ADMIN']>

export function getExternalRepoHost(externalRepoUrl: string | null | undefined): string | undefined {
  if (!externalRepoUrl) return undefined
  try {
    return new URL(externalRepoUrl).host
  } catch {
    return undefined
  }
}

export function hasFileContentChanged(file: { content_sha256?: string } | null | undefined, content: string): boolean {
  return file?.content_sha256 !== digestContent(content)
}

export function digestContent(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

export function generateUsername(email: string): string {
  const localPart = email.split('@')[0]
  return localPart.replaceAll(/[^\w-]/g, '')
}

export function generateUsernameCandidates(email: string): string[] {
  const username = generateUsername(email)
  return [username, `${username}_1`, `${username}_2`, `${username}_3`]
}

export function generateName(firstName: string | null, lastName: string | null): string {
  const parts = [firstName, lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'User'
}

export function generateProjectRoleGroupPath(projectSlug: string, rawGroupPathSuffixes: string): string[] {
  return rawGroupPathSuffixes
    .split(',')
    .map(path => path.trim())
    .filter(Boolean)
    .map(path => `/${projectSlug}${path}`)
}

export function generateAdminRoleMapping(
  roles: ProjectWithDetails['roles'],
  adminGroupPath: string,
  auditorGroupPath: string,
): { adminRoleId?: string, auditorRoleId?: string } {
  const roleIdByOidcGroup = new Map<string | null, string>(roles.map(r => [r.oidcGroup, r.id] as [string | null, string]))
  return {
    adminRoleId: roleIdByOidcGroup.get(adminGroupPath),
    auditorRoleId: roleIdByOidcGroup.get(auditorGroupPath),
  }
}

export function generateAccessLevelMapping(
  project: ProjectWithDetails,
  groupPaths: { reporter: string[], developer: string[], maintainer: string[] },
): Map<string, ProjectAccessLevel> {
  const getAccessLevelFromOidcGroup = (oidcGroup: string | null): ProjectAccessLevel | null => {
    if (!oidcGroup) return null
    if (groupPaths.reporter.includes(oidcGroup)) return AccessLevel.REPORTER
    if (groupPaths.developer.includes(oidcGroup)) return AccessLevel.DEVELOPER
    if (groupPaths.maintainer.includes(oidcGroup)) return AccessLevel.MAINTAINER
    return null
  }

  const roleAccessLevelById = new Map<string, ProjectAccessLevel | null>(
    project.roles.map(role => [role.id, getAccessLevelFromOidcGroup(role.oidcGroup)]),
  )

  return new Map<string, ProjectAccessLevel>(project.members.map((membership) => {
    let highest: ProjectAccessLevel | null = null
    for (const roleId of membership.roleIds) {
      const level = roleAccessLevelById.get(roleId)
      if (level !== null && level !== undefined && (highest === null || level > highest)) highest = level
    }
    return [membership.user.id, highest ?? AccessLevel.GUEST] as const
  }))
}

export function readGitlabCIConfigContent() {
  return readFile(join(__dirname, './files/.gitlab-ci.yml'), 'utf-8')
}

export function readMirrorScriptContent() {
  return readFile(join(__dirname, './files/mirror.sh'), 'utf-8')
}
