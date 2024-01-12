import type { Plugin } from '@dso-console/hooks'
import {
  createDsoProject,
  archiveDsoProject,
  createDsoRepository,
  updateDsoRepository,
  deleteDsoRepository,
  addDsoGroupMember,
  removeDsoGroupMember,
  checkApi,
  getDsoProjectSecrets,
} from './functions.js'
import { getGroupRootId } from './utils.js'
import infos from './infos.js'
import monitor from './monitor.js'

const start = () => {
  getGroupRootId()
}

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    addUserToProject: { steps: { main: addDsoGroupMember } },
    removeUserFromProject: { steps: { main: removeDsoGroupMember } },
    createProject: {
      steps: {
        check: checkApi,
        main: createDsoProject,
      },
    },
    archiveProject: { steps: { main: archiveDsoProject } },
    createRepository: {
      steps: {
        main: createDsoRepository,
      },
    },
    updateRepository: { steps: { main: updateDsoRepository } },
    deleteRepository: { steps: { main: deleteDsoRepository } },
    getProjectSecrets: { steps: { main: getDsoProjectSecrets } },
  },
  monitor,
  start,
}
