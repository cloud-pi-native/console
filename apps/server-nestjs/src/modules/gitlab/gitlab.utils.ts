import { AccessLevel } from '@gitbeaker/core'
import type { PaginationRequestOptions, BaseRequestOptions, OffsetPagination, RepositoryFileExpandedSchema } from '@gitbeaker/core'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ProjectWithDetails } from './gitlab-datastore.service.js'
import { DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX, DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX, DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX } from './gitlab.constant.js'

export function generateUsername(email: string) {
  return email.replace('@', '.')
}

export function getPluginConfig(project: ProjectWithDetails, key: string) {
  return project.plugins?.find(p => p.key === key)?.value
}

export function getGroupPathSuffixes(project: ProjectWithDetails, key: string) {
  const value = getPluginConfig(project, key)
  if (!value) return null
  return value.split(',').map(path => `/${project.slug}${path}`)
}

export function getProjectMaintainerGroupPaths(project: ProjectWithDetails) {
  return getGroupPathSuffixes(project, 'projectMaintainerGroupPathSuffix') ?? DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX.split(',')
}

export function getProjectDeveloperGroupPaths(project: ProjectWithDetails) {
  return getGroupPathSuffixes(project, 'projectDeveloperGroupPathSuffix') ?? DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX.split(',')
}

export function getProjectReporterGroupPaths(project: ProjectWithDetails) {
  return getGroupPathSuffixes(project, 'projectReporterGroupPathSuffix') ?? DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX.split(',')
}

export function getGroupAccessLevelFromProjectRole(project: ProjectWithDetails, user: ProjectWithDetails['members'][number]['user']) {
  const projectReporterGroupPathSuffixes = getProjectReporterGroupPaths(project)
  const projectDeveloperGroupPathSuffixes = getProjectDeveloperGroupPaths(project)
  const projectMaintainerGroupPathSuffixes = getProjectMaintainerGroupPaths(project)

  const getAccessLevel = (role: { oidcGroup: string | null }): number | null => {
    if (!role.oidcGroup) return null
    if (projectReporterGroupPathSuffixes.includes(role.oidcGroup)) return AccessLevel.REPORTER
    if (projectDeveloperGroupPathSuffixes.includes(role.oidcGroup)) return AccessLevel.DEVELOPER
    if (projectMaintainerGroupPathSuffixes.includes(role.oidcGroup)) return AccessLevel.MAINTAINER
    return null
  }

  const membership = project.members.find(member => member.user.id === user.id)
  if (!membership) return null

  const rolesById = new Map(project.roles.map(role => [role.id, role]))

  const highestMappedAccessLevel = membership.roleIds.reduce<number | null>((highestAccessLevel, roleId) => {
    const role = rolesById.get(roleId)
    if (!role) return highestAccessLevel
    const level = getAccessLevel(role)
    if (level && level > (highestAccessLevel ?? 0)) return level
    return highestAccessLevel
  }, null)

  return highestMappedAccessLevel
}

export function getGroupAccessLevel(project: ProjectWithDetails, user: ProjectWithDetails['members'][number]['user']): number | null {
  if (project.owner.id === user.id) return AccessLevel.OWNER
  return getGroupAccessLevelFromProjectRole(project, user)
}

export function generateAccessLevelMapping(project: ProjectWithDetails) {
  const projectReporterGroupPathSuffixes = getProjectReporterGroupPaths(project)
  const projectDeveloperGroupPathSuffixes = getProjectDeveloperGroupPaths(project)
  const projectMaintainerGroupPathSuffixes = getProjectMaintainerGroupPaths(project)

  const getAccessLevelFromOidcGroup = (oidcGroup: string | null): number | null => {
    if (!oidcGroup) return null
    if (projectReporterGroupPathSuffixes.includes(oidcGroup)) return AccessLevel.REPORTER
    if (projectDeveloperGroupPathSuffixes.includes(oidcGroup)) return AccessLevel.DEVELOPER
    if (projectMaintainerGroupPathSuffixes.includes(oidcGroup)) return AccessLevel.MAINTAINER
    return null
  }

  const roleAccessLevelById = new Map(
    project.roles.map(role => [role.id, getAccessLevelFromOidcGroup(role.oidcGroup)] as const),
  )

  return new Map(project.members.map((membership) => {
    let highest = AccessLevel.NO_ACCESS
    for (const roleId of membership.roleIds) {
      const level = roleAccessLevelById.get(roleId)
      if (level && level > highest) highest = level
    }
    return [membership.user.id, highest] as const
  }))
}

export function digestContent(content: string) {
  return createHash('sha256').update(content).digest('hex')
}

export function hasFileContentChanged(file: RepositoryFileExpandedSchema, content: string) {
  return file?.content_sha256 !== digestContent(content)
}

export function readGitlabCIConfigContent() {
  return readFile(join(__dirname, './files/.gitlab-ci.yml'), 'utf-8')
}

export async function readMirrorScriptContent() {
  return await readFile(join(__dirname, './files/mirror.sh'), 'utf-8')
}

export async function getAll<T>(
  iterable: AsyncIterable<T>,
): Promise<T[]> {
  const items: T[] = []
  for await (const item of iterable) {
    items.push(item)
  }
  return items
}

export async function find<T>(generator: AsyncGenerator<T>, predicate: (item: T) => boolean): Promise<T | undefined> {
  for await (const item of generator) {
    if (predicate(item)) return item
  }
  return undefined
}

export async function* offsetPaginate<T>(
  request: (options: PaginationRequestOptions<'offset'> & BaseRequestOptions<true>) => Promise<{ data: T[], paginationInfo: OffsetPagination }>,
): AsyncGenerator<T> {
  let page: number | null = 1
  while (page !== null) {
    const { data, paginationInfo } = await request({ page, showExpanded: true, pagination: 'offset' })
    for (const item of data) {
      yield item
    }
    page = paginationInfo.next ? paginationInfo.next : null
  }
}

export function daysAgoFromNow(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}
