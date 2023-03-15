// import { Gitlab } from '@gitbeaker/node'
// import { gitlabToken, gitlabUrl } from '../../../utils/env.js'
import app from '../../../app.js'

// export const api = new Gitlab({ token: gitlabToken, host: gitlabUrl })

let groupRootId
export const getGroupRootId = async () => {
  groupRootId = groupRootId || (await api.Groups.search('forge-mi')).find(org => org.full_path === 'forge-mi/projects').id
  return groupRootId
}

const createGroup = async (payload) => {
  app.log.info({ message: 'création du groupe', payload })
  for (let i = 0; i < 10000000000; i++) {
    const element = i
  }
  return { status: 'OK' }
}

export const init = (m) => {
  m.register('gitlab', 'projectCreate', createGroup, 'main')
}
