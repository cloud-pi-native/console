import type { Plugin } from '@dso-console/hooks'
import {
  createKeycloakEnvGroup,
  createKeycloakProjectGroup,
  deleteKeycloakEnvGroup,
  deleteKeycloakProjectGroup,
  addKeycloakUserToProjectGroup,
  removeKeycloakUserFromProjectGroup,
  retrieveKeycloakUserByEmail,
  manageKeycloakPermission,
} from './functions.js'
import infos from './infos.js'
import monitor from './monitor.js'
import { start } from './client.js'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {
    retrieveUserByEmail: { steps: { main: retrieveKeycloakUserByEmail } },
    createProject: { steps: { main: createKeycloakProjectGroup } },
    addUserToProject: { steps: { main: addKeycloakUserToProjectGroup } },
    removeUserFromProject: { steps: { main: removeKeycloakUserFromProjectGroup } },
    archiveProject: { steps: { main: deleteKeycloakProjectGroup } },
    initializeEnvironment: { steps: { main: createKeycloakEnvGroup } },
    deleteEnvironment: { steps: { main: deleteKeycloakEnvGroup } },
    setEnvPermission: { steps: { main: manageKeycloakPermission } },
  },
  monitor,
  start,
}
