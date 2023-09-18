import { Gitlab } from '@gitbeaker/rest'
import { projectRootDir } from '@/utils/env.js'
import { removeTrailingSlash } from '@dso-console/shared'

export const gitlabUrl = removeTrailingSlash(process.env.GITLAB_URL)
export const gitlabToken = process.env.GITLAB_TOKEN

export const api = new Gitlab({ token: gitlabToken, host: gitlabUrl })
let groupRootId: number

export const getGroupRootId = async () => {
  if (groupRootId) return groupRootId
  const groupRootSearch = await api.Groups.search(projectRootDir)
  groupRootId = (groupRootSearch.find(grp => grp.full_path === projectRootDir)).id
  if (!groupRootId) throw Error(`Gitlab inaccessible, impossible de trouver le groupe ${projectRootDir}`)
  return groupRootId
}
