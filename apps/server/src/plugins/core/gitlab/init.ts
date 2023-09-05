import {
  createDsoProject,
  archiveDsoProject,
  createDsoRepository,
  deleteDsoRepository,
  addDsoGroupMember,
  removeDsoGroupMember,
  checkApi,
} from './index.js'
import { getGroupRootId } from './utils.js'

export const init = (register) => {
  getGroupRootId()
  register('gitlab', {
    addUserToProject: { main: addDsoGroupMember },
    removeUserFromProject: { main: removeDsoGroupMember },
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
