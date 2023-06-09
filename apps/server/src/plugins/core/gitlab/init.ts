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
  register('gitlab', {
    createProject: {
      check: checkApi,
      main: createDsoProject,
    },
    archiveProject: { main: archiveDsoProject },
    createRepository: {
      check: checkApi,
      main: createDsoRepository,
    },
    deleteRepository: { main: deleteDsoRepository },
  })
}
