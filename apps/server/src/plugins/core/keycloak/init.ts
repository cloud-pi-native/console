import { createKeycloakEnvGroup, createKeycloakProjectGroup, deleteKeycloakEnvGroup, deleteKeycloakProjectGroup, addKeycloakUserToProjectGroup, removeKeycloakUserFromProjectGroup } from './index.js'

export const init = (register) => {
  register('keycloak', {
    createProject: { main: createKeycloakProjectGroup },
    addUserToProject: { main: addKeycloakUserToProjectGroup },
    removeUserFromProject: { main: removeKeycloakUserFromProjectGroup },
    archiveProject: { main: deleteKeycloakProjectGroup },
    initializeEnvironment: { main: createKeycloakEnvGroup },
    deleteEnvironment: { main: deleteKeycloakEnvGroup },
  })
}
