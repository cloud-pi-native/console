import type { GitlabClient as IGitlabClient } from '@cpn-console/miracle'
import { alchemy, find, GitlabClient, GitlabGroup, GitlabGroupCustomAttribute, offsetPaginate, prismaStateStore } from '@cpn-console/miracle'
import config from './config.js'
import { customAttributesFilter, groupRootCustomAttributeKey, managedByConsoleCustomAttributeKey } from './custom-attributes.js'
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
  const projectRootDir = config().projectsRootDir
  logger.info({ action: 'createGroupRoot', projectRootDir }, 'Create group root hierarchy')

  const parts = projectRootDir.split('/').filter(Boolean)
  if (parts.length === 0) throw new Error('No projectRootDir available')

  const client = getClient()

  return alchemy.run(`group-root-${projectRootDir}`, { phase: 'up', stateStore: prismaStateStore() }, async () => {
    let parentId: number | undefined
    let fullPath = ''

    for (const [idx, part] of parts.entries()) {
      const id = parts.slice(0, idx + 1).join('-')
      const groupResource = await GitlabGroup(`group-root-${id}`, {
        client,
        name: part,
        path: part,
        parentId,
        createArgs: parentId ? { visibility: 'internal' } : undefined,
      })
      assertHasOutput<{ id: number }>(groupResource, 'GitlabGroup(groupRoot)')
      parentId = groupResource.output.id
      fullPath = fullPath ? `${fullPath}/${part}` : part

      if (fullPath === projectRootDir) {
        await GitlabGroupCustomAttribute(`group-root-dir-${projectRootDir}`, {
          client,
          groupId: parentId,
          key: groupRootCustomAttributeKey,
          value: projectRootDir,
        })
        await GitlabGroupCustomAttribute(`group-root-managed-${projectRootDir}`, {
          client,
          groupId: parentId,
          key: managedByConsoleCustomAttributeKey,
          value: 'true',
        })
        groupRootId = parentId
        return parentId
      }
    }

    throw new Error('No projectRootDir available or is malformed')
  })
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
  if (error instanceof Error) {
    error.message = error.message.replace(keyValueRegExp, '//MASKED:MASKED@')
    const cause = (error as Error & { cause?: unknown }).cause
    if (cause && typeof cause === 'object') {
      const maybeDescription = (cause as { description?: unknown }).description
      if (typeof maybeDescription === 'string') {
        ;(cause as { description: string }).description = maybeDescription.replace(keyValueRegExp, '//MASKED:MASKED@')
      }
      const maybeUrl = (cause as { url?: unknown }).url
      if (typeof maybeUrl === 'string') {
        ;(cause as { url: string }).url = maybeUrl.replace(keyValueRegExp, '//MASKED:MASKED@')
      }
    }
  }
  return error
}

export function matchRole(projectSlug: string, roleOidcGroup: string, configuredRolePath: string[]) {
  return configuredRolePath.some(path => roleOidcGroup === `/${projectSlug}${path}`)
}

export { find } from '@cpn-console/miracle'
export { getAll } from '@cpn-console/miracle'
export { offsetPaginate } from '@cpn-console/miracle'

function assertHasOutput<T>(resource: unknown, name: string): asserts resource is { output: T } {
  if (typeof resource !== 'object' || resource === null || !('output' in resource)) {
    throw new Error(`${name} did not return an output-bearing resource`)
  }
}
