import type { BaseRequestOptions, GroupSchema, Gitlab as IGitlab, OffsetPagination, PaginationRequestOptions } from '@gitbeaker/core'
import { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import { Gitlab } from '@gitbeaker/rest'
import config from './config.js'
import { customAttributesFilter, groupRootCustomAttributeKey, managedByConsoleCustomAttributeKey, upsertCustomAttribute } from './custom-attributes.js'
import { logger } from './logger.js'

let api: IGitlab | undefined

let groupRootId: number

export async function getGroupRootId(throwIfNotFound?: true): Promise<number>
export async function getGroupRootId(throwIfNotFound?: false): Promise<number | undefined>
export async function getGroupRootId(throwIfNotFound?: boolean): Promise<number | undefined> {
  const gitlabApi = getApi()
  const projectRootDir = config().projectsRootDir
  logger.debug({ action: 'getGroupRootId', projectRootDir }, 'Resolve group root id')
  if (groupRootId) return groupRootId
  const groupRootByAttr = await find(
    offsetPaginate<GroupSchema>(opts => gitlabApi.Groups.all({
      ...customAttributesFilter(groupRootCustomAttributeKey, projectRootDir),
      ...opts,
    }), { perPage: 100, maxPages: 1 }),
    grp => grp.full_path === projectRootDir,
  )
  if (groupRootByAttr) {
    groupRootId = groupRootByAttr.id
    return groupRootId
  }
  const groupRoot = await find(
    offsetPaginate(opts => gitlabApi.Groups.all({
      search: projectRootDir,
      ...opts,
    }), { perPage: 100 }),
    grp => grp.full_path === projectRootDir,
  )
  logger.debug({ action: 'getGroupRootId', groupRootId: groupRoot?.id, groupRootPath: groupRoot?.full_path }, 'Resolved group root')
  const searchId = groupRoot?.id
  if (typeof searchId === 'undefined') {
    if (throwIfNotFound) {
      throw new Error(`Gitlab inaccessible, impossible de trouver le groupe RACINE ${projectRootDir}`)
    }
    return searchId
  }
  groupRootId = searchId
  try {
    await upsertCustomAttribute('groups', groupRootId, groupRootCustomAttributeKey, projectRootDir)
    await upsertCustomAttribute('groups', groupRootId, managedByConsoleCustomAttributeKey, 'true')
  } catch (err) {
    logger.debug({ action: 'getGroupRootId', groupRootId, err }, 'Failed to upsert group root custom attribute')
  }
  return groupRootId
}

async function createGroupRoot(): Promise<number> {
  logger.info({ action: 'createGroupRoot', projectRootDir: config().projectsRootDir }, 'Create group root hierarchy')
  const gitlabApi = getApi()
  const projectRootDir = config().projectsRootDir
  const projectRootDirArray = projectRootDir.split('/')

  const rootGroupPath = projectRootDirArray.shift()
  if (!rootGroupPath) {
    throw new Error('No projectRootDir available')
  }

  let parentGroup = await find(offsetPaginate(opts => gitlabApi.Groups.all({
    search: rootGroupPath,
    ...opts,
  }), { perPage: 100 }), grp => grp.full_path === rootGroupPath) ?? await gitlabApi.Groups.create(rootGroupPath, rootGroupPath)

  if (parentGroup.full_path === projectRootDir) {
    try {
      await upsertCustomAttribute('groups', parentGroup.id, groupRootCustomAttributeKey, projectRootDir)
      await upsertCustomAttribute('groups', parentGroup.id, managedByConsoleCustomAttributeKey, 'true')
    } catch (err) {
      logger.debug({ action: 'createGroupRoot', groupRootId: parentGroup.id, err }, 'Failed to upsert group root custom attribute')
    }
    return parentGroup.id
  }

  for (const path of projectRootDirArray) {
    const futureFullPath = `${parentGroup.full_path}/${path}`
    parentGroup = await find(offsetPaginate(opts => gitlabApi.Groups.all({
      search: futureFullPath,
      ...opts,
    }), { perPage: 100 }), grp => grp.full_path === futureFullPath) ?? await gitlabApi.Groups.create(path, path, { parentId: parentGroup.id, visibility: 'internal' })

    if (parentGroup.full_path === projectRootDir) {
      try {
        await upsertCustomAttribute('groups', parentGroup.id, groupRootCustomAttributeKey, projectRootDir)
        await upsertCustomAttribute('groups', parentGroup.id, managedByConsoleCustomAttributeKey, 'true')
      } catch (err) {
        logger.debug({ action: 'createGroupRoot', groupRootId: parentGroup.id, err }, 'Failed to upsert group root custom attribute')
      }
      return parentGroup.id
    }
  }
  throw new Error('No projectRootDir available or is malformed')
}

export async function getOrCreateGroupRoot(): Promise<number> {
  return await getGroupRootId(false) ?? createGroupRoot()
}

export function getApi(): IGitlab {
  api ??= new Gitlab({ token: config().token, host: config().internalUrl })
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

// eslint-disable-next-line regexp/no-super-linear-backtracking
const keyValueRegExp = /\/\/(.*):(.*)@/g

export function cleanGitlabError<T>(error: T): T {
  if (error instanceof GitbeakerRequestError && error.cause?.description) {
    error.cause.description = String(error.cause.description).replaceAll(keyValueRegExp, '//MASKED:MASKED@')
  }
  return error
}

export function matchRole(projectSlug: string, roleOidcGroup: string, configuredRolePath: string[]) {
  return configuredRolePath.some(path => roleOidcGroup === `/${projectSlug}${path}`)
}

export interface OffsetPaginateOptions {
  startPage?: number
  perPage?: number
  maxPages?: number
}

export async function* offsetPaginate<T>(
  request: (options: PaginationRequestOptions<'offset'> & BaseRequestOptions<true>) => Promise<{ data: T[], paginationInfo: OffsetPagination }>,
  options?: OffsetPaginateOptions,
): AsyncGenerator<T> {
  let page: number | null = options?.startPage ?? 1
  let pagesFetched = 0
  let total: number = 0
  logger.debug({ action: 'offsetPaginate', page }, 'Pagination start')
  while (page !== null) {
    if (options?.maxPages && pagesFetched >= options.maxPages) {
      page = null
      continue
    }
    try {
      const { data, paginationInfo } = await request({
        page,
        perPage: options?.perPage,
        maxPages: options?.maxPages,
        showExpanded: true,
        pagination: 'offset',
      })
      pagesFetched += 1
      total += data.length
      logger.debug(
        { action: 'offsetPaginate', page, nextPage: paginationInfo.next, items: data.length, total },
        'Pagination page fetched',
      )
      for (const item of data) {
        yield item
      }
      page = paginationInfo.next
    } catch (error) {
      logger.error({ action: 'offsetPaginate', page, err: error }, 'Pagination request failed')
      throw error
    }
  }
  logger.debug({ action: 'offsetPaginate', total }, 'Pagination done')
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
