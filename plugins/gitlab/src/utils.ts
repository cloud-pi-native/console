import { Gitlab } from '@gitbeaker/rest'
import { Gitlab as IGitlab } from '@gitbeaker/core'
import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'

let api: IGitlab | undefined

let groupRootId: number | void

const config: {
  token?: string,
  url?: string,
  projectsRootDir?: string,
} = {
  token: undefined,
  url: undefined,
  projectsRootDir: undefined,
}

export const getGroupRootId = async (): Promise<number> => {
  const gitlabApi = getApi()
  const projectRootDir = getConfig().projectsRootDir
  if (groupRootId) return groupRootId
  const groupRootSearch = await gitlabApi.Groups.search(projectRootDir)
  groupRootId = (groupRootSearch.find(grp => grp.full_path === projectRootDir))?.id
  if (!groupRootId) throw Error(`Gitlab inaccessible, impossible de trouver le groupe ${projectRootDir}`)
  return groupRootId
}

export const getApi = (): IGitlab => {
  if (!api) {
    const gitlabUrl = removeTrailingSlash(requiredEnv('GITLAB_URL'))
    const gitlabToken = requiredEnv('GITLAB_TOKEN')
    // @ts-ignore
    api = new Gitlab({ token: gitlabToken, host: gitlabUrl })
  }
  // @ts-ignore
  return api
}

export const getConfig = (): {
  token: string,
  url: string,
  projectsRootDir: string,
} => {
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

export const shallowEqual = (object1: Record<string, unknown>, object2: Record<string, unknown>) => {
  const keys1 = Object.keys(object1)
  const keys2 = Object.keys(object2)

  if (keys1.length !== keys2.length) {
    return false
  }

  for (const key of keys1) {
    if (object1[key] !== object2[key]) {
      return false
    }
  }

  return true
}
