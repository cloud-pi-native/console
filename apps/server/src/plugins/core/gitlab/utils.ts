import { Gitlab } from '@gitbeaker/rest'
import { gitlabToken, gitlabUrl, projectRootDir } from '../../../utils/env.js'

export const api = new Gitlab({ token: gitlabToken, host: gitlabUrl })

let groupRootId

export const getGroupRootId = async () => {
  if (groupRootId) return groupRootId
  const groupRootSearch = await api.Groups.search(projectRootDir)
  // @ts-ignore TODO: Semble être un tableau
  groupRootId = (groupRootSearch.find(grp => grp.full_path === projectRootDir)).id
  if (!groupRootId) throw Error(`Gitlab inaccessible, impossible de trouver le groupe ${projectRootDir}`)
  return groupRootId
}
