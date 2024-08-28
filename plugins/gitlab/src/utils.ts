import { Gitlab } from '@gitbeaker/rest'
import type { Gitlab as IGitlab } from '@gitbeaker/core'
import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'
import { GitbeakerRequestError } from '@gitbeaker/requester-utils'

let api: IGitlab | undefined

let groupRootId: number | void

const config: {
  token?: string
  url?: string
  projectsRootDir?: string
} = {
  token: undefined,
  url: undefined,
  projectsRootDir: undefined,
}

export async function getGroupRootId(): Promise<number> {
  const gitlabApi = getApi()
  const projectRootDir = getConfig().projectsRootDir
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
    const gitlabUrl = removeTrailingSlash(requiredEnv('GITLAB_URL'))
    const gitlabToken = requiredEnv('GITLAB_TOKEN')
    // @ts-ignore
    api = new Gitlab({ token: gitlabToken, host: gitlabUrl })
  }
  // @ts-ignore
  return api
}

export function getConfig(): {
  token: string
  url: string
  projectsRootDir: string
} {
  if (!config.projectsRootDir || !config.token || !config.url) {
    config.token = requiredEnv('GITLAB_TOKEN')
    config.url = removeTrailingSlash(requiredEnv('GITLAB_URL'))
    config.projectsRootDir = requiredEnv('PROJECTS_ROOT_DIR')
  }
  // @ts-ignore trouver un meilleur softboot
  return config
}

export const infraAppsRepoName = 'infra-apps'
export const internalMirrorRepoName = 'mirror'

export interface VaultSecrets {
  GITLAB: {
    ORGANIZATION_NAME: string
    PROJECT_NAME: string
    GIT_MIRROR_PROJECT_ID: number
    GIT_MIRROR_TOKEN: string
  }
}

export function cleanGitlabError<T>(error: T): T {
  if (error instanceof GitbeakerRequestError && error.cause?.description) {
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    error.cause.description = error.cause.description.replaceAll(/\/\/(.*):(.*)@/g, '//MASKED:MASKED@')
  }
  return error
}
