import { Gitlab } from '@gitbeaker/node'
import { gitlabToken, gitlabUrl } from '../../utils/env.js'

export const api = new Gitlab({ token: gitlabToken, host: gitlabUrl })

let groupRootId
export const getGroupRootId = async () => {
  groupRootId = groupRootId || (await api.Groups.search('forge-mi')).find(org => org.full_path === 'forge-mi/projects').id
  return groupRootId
}
