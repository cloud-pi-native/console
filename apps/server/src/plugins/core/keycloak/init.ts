import {
  createKeycloakEnvGroup, createKeycloakProjectGroup, deleteKeycloakEnvGroup, deleteKeycloakProjectGroup, addKeycloakUserToProjectGroup, removeKeycloakUserFromProjectGroup,
  retrieveKeycloakUserByEmail,
} from './index.js'

export const init = (register) => {
  register('keycloak', {
    retrieveUserByEmail: { main: retrieveKeycloakUserByEmail },
    createProject: { main: createKeycloakProjectGroup },
    addUserToProject: { main: addKeycloakUserToProjectGroup },
    removeUserFromProject: { main: removeKeycloakUserFromProjectGroup },
    archiveProject: { main: deleteKeycloakProjectGroup },
    initializeEnvironment: { main: createKeycloakEnvGroup },
    deleteEnvironment: { main: deleteKeycloakEnvGroup },
  })
}
