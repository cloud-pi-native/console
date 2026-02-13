import { Gitlab } from '@gitbeaker/rest'
import type { BaseRequestOptions, Gitlab as IGitlab, ShowExpanded, Sudo } from '@gitbeaker/core'
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
  const searchId = (await find(opts => gitlabApi.Groups.all(opts), grp => grp.full_path === projectRootDir, { search: projectRootDir }))?.id
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

  let parentGroup = await find(opts => gitlabApi.Groups.all(opts), grp => grp.full_path === rootGroupPath, { search: rootGroupPath })
  parentGroup ??= await gitlabApi.Groups.create(rootGroupPath, rootGroupPath)

  if (parentGroup.full_path === projectRootDir) {
    return parentGroup.id
  }

  for (const path of projectRootDirArray) {
    const futureFullPath: string = `${parentGroup.full_path}/${path}`
    parentGroup = await find(opts => gitlabApi.Groups.all(opts), grp => grp.full_path === futureFullPath, { search: futureFullPath })
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

export async function* iterator<T>(
  request: (options?: Sudo & ShowExpanded<true>) => Promise<{ data: T[], paginationInfo: any }>,
  options: any = {},
): AsyncGenerator<T> {
  let page = 1
  let hasNext = true
  while (hasNext) {
    const { data, paginationInfo } = await request({ ...options, page, showExpanded: true })
    for (const item of data) {
      yield item
    }
    if (paginationInfo.next) {
      page = paginationInfo.next
    } else {
      hasNext = false
    }
  }
}

export async function getAll<T>(
  request: (options?: BaseRequestOptions<true>) => Promise<{ data: T[], paginationInfo: any }>,
  options: BaseRequestOptions<true> = {},
): Promise<T[]> {
  const items: T[] = []
  for await (const item of iterator(request, options)) {
    items.push(item)
  }
  return items
}

export async function find<T>(
  request: (options?: BaseRequestOptions<true>) => Promise<{ data: T[], paginationInfo: any }>,
  predicate: (item: T) => boolean,
  options: BaseRequestOptions<true> = {},
): Promise<T | undefined> {
  for await (const item of iterator(request, options)) {
    if (predicate(item)) {
      return item
    }
  }
  return undefined
}
