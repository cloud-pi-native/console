import { getGroupRootId } from './index.js'
import { createGroup, deleteGroup } from './group.js'

export const init = (register) => {
  getGroupRootId()
  register('gitlab', 'createProject', createGroup, 'main')
  register('gitlab', 'archiveProject', deleteGroup, 'main')
}
