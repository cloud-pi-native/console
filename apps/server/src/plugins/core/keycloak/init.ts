import type { RegisterFn } from '@/plugins/index.js'
import {
  createKeycloakEnvGroup,
  createKeycloakProjectGroup,
  deleteKeycloakEnvGroup,
  deleteKeycloakProjectGroup,
  addKeycloakUserToProjectGroup,
  removeKeycloakUserFromProjectGroup,
  retrieveKeycloakUserByEmail,
  manageKeycloakPermission,
} from './index.js'
import infos from './infos.js'

export const init = (register: RegisterFn) => {
  register(
    infos.name,
    {
      retrieveUserByEmail: { main: retrieveKeycloakUserByEmail },
      createProject: { main: createKeycloakProjectGroup },
      addUserToProject: { main: addKeycloakUserToProjectGroup },
      removeUserFromProject: { main: removeKeycloakUserFromProjectGroup },
      archiveProject: { main: deleteKeycloakProjectGroup },
      initializeEnvironment: { main: createKeycloakEnvGroup },
      deleteEnvironment: { main: deleteKeycloakEnvGroup },
      setEnvPermission: { main: manageKeycloakPermission },
    },
  )
}
