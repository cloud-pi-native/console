import { Gitlab } from '@gitbeaker/rest'
import type { Gitlab as IGitlab } from '@gitbeaker/core'
import { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import config from './config'

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
