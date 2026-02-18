import { Gitlab } from '@gitbeaker/rest'
import type { Gitlab as IGitlab, BaseRequestOptions, PaginationRequestOptions, OffsetPagination } from '@gitbeaker/core'
import { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import config from './config.js'

let api: IGitlab | undefined

let groupRootId: number

export async function getGroupRootId(throwIfNotFound?: true): Promise<number>
export async function getGroupRootId(throwIfNotFound?: false): Promise<number | undefined>
export async function getGroupRootId(throwIfNotFound?: boolean): Promise<number | undefined> {
  const gitlabApi = getApi()
  const projectRootDir = config().projectsRootDir
  if (groupRootId) return groupRootId
  const searchGroup = await find(
    offsetPaginate(opts => gitlabApi.Groups.all({ ...opts, search: projectRootDir })),
    grp => grp.full_path === projectRootDir,
  )
  const searchId = searchGroup?.id
  if (searchId === undefined) {
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

  let parentGroup = await find(
    offsetPaginate(opts => gitlabApi.Groups.all({ ...opts, search: rootGroupPath })),
    grp => grp.full_path === rootGroupPath,
  ) ?? await gitlabApi.Groups.create(rootGroupPath, rootGroupPath)

  if (parentGroup.full_path === projectRootDir) {
    return parentGroup.id
  }

  for (const path of projectRootDirArray) {
    const futureFullPath: string = `${parentGroup.full_path}/${path}`
    parentGroup = await find(
      offsetPaginate(opts => gitlabApi.Groups.all({ ...opts, search: futureFullPath })),
      grp => grp.full_path === futureFullPath,
    ) ?? await gitlabApi.Groups.create(path, path, { parentId: parentGroup.id, visibility: 'internal' })

    if (parentGroup.full_path === projectRootDir) {
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

export function cleanGitlabError<T>(error: T): T {
  if (error instanceof GitbeakerRequestError && error.cause?.description) {
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    error.cause.description = String(error.cause.description).replaceAll(/\/\/(.*):(.*)@/g, '//MASKED:MASKED@')
  }
  return error
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
