import { Gitlab } from '@gitbeaker/rest'
import { type Gitlab as IGitlab, type BaseRequestOptions, type PaginationRequestOptions, type OffsetPagination, AccessLevel } from '@gitbeaker/core'
import { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import config from './config.js'
import type { Config, Project, Role } from '@cpn-console/hooks'
import { DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX, DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX, DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX } from './infos.js'

let api: IGitlab | undefined

let groupRootId: number

export async function getGroupRootId(throwIfNotFound?: true): Promise<number>
export async function getGroupRootId(throwIfNotFound?: false): Promise<number | undefined>
export async function getGroupRootId(throwIfNotFound?: boolean): Promise<number | undefined> {
  const gitlabApi = getApi()
  const projectRootDir = config().projectsRootDir
  if (groupRootId) return groupRootId
  const groupRootSearch = await gitlabApi.Groups.search(projectRootDir)
  const searchId = (groupRootSearch.find(grp => grp.full_path === projectRootDir))?.id
  if (typeof searchId === 'undefined') {
    if (throwIfNotFound) {
      throw new Error(`Gitlab inaccessible, impossible de trouver le groupe ${projectRootDir}`)
    }
    return searchId
  }
  groupRootId = searchId
  return groupRootId
}

async function createGroupRoot(): Promise<number> {
  const gitlabApi = getApi()
  const projectRootDir = config().projectsRootDir
  const projectRootDirArray = projectRootDir.split('/')

  const rootGroupPath = projectRootDirArray.shift()
  if (!rootGroupPath) {
    throw new Error('No projectRootDir available')
  }

  let parentGroup = (await gitlabApi.Groups.search(rootGroupPath))
    .find(grp => grp.full_path === rootGroupPath)
    ?? await gitlabApi.Groups.create(rootGroupPath, rootGroupPath)

  if (parentGroup.full_path === projectRootDir) {
    return parentGroup.id
  }

  for (const path of projectRootDirArray) {
    const futureFullPath = `${parentGroup.full_path}/${path}`
    parentGroup = (await gitlabApi.Groups.search(futureFullPath))
      .find(grp => grp.full_path === futureFullPath)
      ?? await gitlabApi.Groups.create(path, path, { parentId: parentGroup.id, visibility: 'internal' })

    if (parentGroup.full_path === projectRootDir) {
      return parentGroup.id
    }
  }
  throw new Error('No projectRootDir available or is malformed')
}

export async function getOrCreateGroupRoot(): Promise<number> {
  let rootId = await getGroupRootId(false)
  if (typeof rootId === 'undefined') {
    rootId = await createGroupRoot()
  }
  return rootId
}

export function getApi(): IGitlab {
  if (!api) {
    api = new Gitlab({ token: config().token, host: config().internalUrl })
  }
  return api
}

export const infraAppsRepoName = 'infra-apps'
export const internalMirrorRepoName = 'mirror'

export interface VaultSecrets {
  GITLAB: {
    PROJECT_SLUG: string
    GIT_MIRROR_PROJECT_ID: number
    GIT_MIRROR_TOKEN: string
  }
}

export function cleanGitlabError<T>(error: T): T {
  if (error instanceof GitbeakerRequestError && error.cause?.description) {
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    error.cause.description = String(error.cause.description).replaceAll(/\/\/(.*):(.*)@/g, '//MASKED:MASKED@')
  }
  return error
}

export function matchRole(projectSlug: string, roleOidcGroup: string, configuredRolePath: string) {
  return roleOidcGroup === `/${projectSlug}${configuredRolePath}`
}

export function resolveAccessLevel(project: Project, role: Role, config: Config) {
  const projectReporterGroupPathSuffix = config.gitlab?.projectReporterGroupPathSuffix ?? DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX
  const projectDeveloperGroupPathSuffix = config.gitlab?.projectDeveloperGroupPathSuffix ?? DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX
  const projectMaintainerGroupPathSuffix = config.gitlab?.projectMaintainerGroupPathSuffix ?? DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX

  if (!role.oidcGroup) return undefined

  let accessLevel: number | undefined
  if (role.name === 'owner') {
    accessLevel = AccessLevel.OWNER
  } else if (matchRole(project.slug, role.oidcGroup, projectReporterGroupPathSuffix)) {
    accessLevel = AccessLevel.GUEST
  } else if (matchRole(project.slug, role.oidcGroup, projectDeveloperGroupPathSuffix)) {
    accessLevel = AccessLevel.DEVELOPER
  } else if (matchRole(project.slug, role.oidcGroup, projectMaintainerGroupPathSuffix)) {
    accessLevel = AccessLevel.MAINTAINER
  }

  return accessLevel
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
    page = paginationInfo.next
  }
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

export async function find<T>(
  iterable: AsyncIterable<T>,
  predicate: (item: T) => boolean,
): Promise<T | undefined> {
  for await (const item of iterable) {
    if (predicate(item)) {
      return item
    }
  }
  return undefined
}
