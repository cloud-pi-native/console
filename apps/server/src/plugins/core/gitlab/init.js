import { getGroupRootId, createDsoProject, archiveDsoProject, createDsoRepository } from './index.js'

export const init = (register) => {
  getGroupRootId()
  register('gitlab', 'createProject', createDsoProject, 'main')
  register('gitlab', 'archiveProject', archiveDsoProject, 'main')
  register('gitlab', 'createRepository', createDsoRepository, 'main')
}
