import type { GitlabClient as IGitlabClient } from '@cpn-console/miracle'
import { find, GitlabClient, GitlabHttpError, offsetPaginate } from '@cpn-console/miracle'
import config from './config.js'
import { customAttributesFilter, groupRootCustomAttributeKey } from './custom-attributes.js'
import { logger } from './logger.js'

let client: IGitlabClient | undefined

let groupRootId: number | undefined

export const MAX_PAGINATION_PER_PAGE = 100

export async function getGroupRootId(throwIfNotFound?: true): Promise<number>
export async function getGroupRootId(throwIfNotFound?: false): Promise<number | undefined>
export async function getGroupRootId(throwIfNotFound?: boolean): Promise<number | undefined> {
  const projectRootDir = config().projectsRootDir
  logger.debug({ action: 'getGroupRootId', projectRootDir }, 'Resolve group root id')
  if (groupRootId) return groupRootId
  const fast = await find(
    offsetPaginate(opts => getClient().groupsAll({
      ...customAttributesFilter(groupRootCustomAttributeKey, projectRootDir),
    }, opts.page, opts.perPage), { perPage: MAX_PAGINATION_PER_PAGE }),
    grp => grp.full_path === projectRootDir,
  )
  const groupRoot = fast ?? await find(
    offsetPaginate(opts => getClient().groupsAll({
      search: projectRootDir,
    }, opts.page, opts.perPage), { perPage: MAX_PAGINATION_PER_PAGE }),
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
  return groupRootId
}

async function createGroupRoot(): Promise<number> {
  logger.info({ action: 'createGroupRoot', projectRootDir: config().projectsRootDir }, 'Create group root hierarchy')
  const projectRootDir = config().projectsRootDir
  const projectRootDirArray = projectRootDir.split('/')

  const rootGroupPath = projectRootDirArray.shift()
  if (!rootGroupPath) {
    throw new Error('No projectRootDir available')
  }

  let parentGroup = await find(
    offsetPaginate(opts => getClient().groupsAll({ search: rootGroupPath }, opts.page, opts.perPage), { perPage: MAX_PAGINATION_PER_PAGE }),
    grp => grp.full_path === rootGroupPath,
  ) ?? await getClient().groupsCreate(rootGroupPath, rootGroupPath)

  if (parentGroup.full_path === projectRootDir) {
    return parentGroup.id
  }

  for (const path of projectRootDirArray) {
    const futureFullPath = `${parentGroup.full_path}/${path}`
    parentGroup = await find(
      offsetPaginate(opts => getClient().groupsAll({ search: futureFullPath }, opts.page, opts.perPage), { perPage: MAX_PAGINATION_PER_PAGE }),
      grp => grp.full_path === futureFullPath,
    ) ?? await getClient().groupsCreate(path, path, { parentId: parentGroup.id, visibility: 'internal' })

    if (parentGroup.full_path === projectRootDir) {
      return parentGroup.id
    }
  }
  throw new Error('No projectRootDir available or is malformed')
}

export async function getOrCreateGroupRoot(): Promise<number> {
  return await getGroupRootId(false) ?? createGroupRoot()
}

export function getClient(): IGitlabClient {
  client ??= new GitlabClient({
    host: config().internalUrl,
    token: config().token,
  })
  return client
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

const keyValueRegExp = /\/\/[^/@][^/:@]*:[^/@]*@/g

export function cleanGitlabError<T>(error: T): T {
  if (error instanceof GitlabHttpError) {
    error.description = error.description.replace(keyValueRegExp, '//MASKED:MASKED@')
  }
  if (error instanceof Error) {
    error.message = error.message.replace(keyValueRegExp, '//MASKED:MASKED@')
  }
  return error
}

export function matchRole(projectSlug: string, roleOidcGroup: string, configuredRolePath: string[]) {
  return configuredRolePath.some(path => roleOidcGroup === `/${projectSlug}${path}`)
}

export { find } from '@cpn-console/miracle'
export { getAll } from '@cpn-console/miracle'
export { offsetPaginate } from '@cpn-console/miracle'
