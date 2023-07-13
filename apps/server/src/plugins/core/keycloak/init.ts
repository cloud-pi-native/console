import { createKeycloakEnvGroup, createKeycloakProjectGroup, deleteKeycloakEnvGroup, deleteKeycloakProjectGroup } from './index.js'

export const init = (register) => {
  register('keycloak', {
    createProject: { main: createKeycloakProjectGroup },
    archiveProject: { main: deleteKeycloakProjectGroup },
    initializeEnvironment: { main: createKeycloakEnvGroup },
    deleteEnvironment: { main: deleteKeycloakEnvGroup },
  })
}
