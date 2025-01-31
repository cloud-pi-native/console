import { Gitlab } from '@gitbeaker/rest'
import type { Gitlab as IGitlab } from '@gitbeaker/core'
import { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import config from './config.js'

let api: IGitlab | undefined

let groupRootId: number | void

export async function getGroupRootId(): Promise<number> {
  const gitlabApi = getApi()
  const projectRootDir = config().projectsRootDir
  if (groupRootId) return groupRootId
  const groupRootSearch = await gitlabApi.Groups.search(projectRootDir)
  groupRootId = (groupRootSearch.find(grp => grp.full_path === projectRootDir))?.id
  if (!groupRootId) {
    throw new Error(`Gitlab inaccessible, impossible de trouver le groupe ${projectRootDir}`)
  }
  return groupRootId
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
