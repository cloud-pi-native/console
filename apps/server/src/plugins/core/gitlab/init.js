import {
  createDsoProject,
  archiveDsoProject,
  createDsoRepository,
  deleteDsoRepository,
  checkApi,
} from './index.js'
import { getGroupRootId } from './utils.js'

export const init = (register) => {
  getGroupRootId()
  register('gitlab', 'createProject', checkApi, 'check')
  register('gitlab', 'createProject', createDsoProject, 'main')
  register('gitlab', 'archiveProject', archiveDsoProject, 'main')
  register('gitlab', 'createRepository', checkApi, 'check')
  register('gitlab', 'createRepository', createDsoRepository, 'main')
  // register('gitlab', 'updateRepository', updateDsoRepository, 'main')
  register('gitlab', 'deleteRepository', deleteDsoRepository, 'main')
}
